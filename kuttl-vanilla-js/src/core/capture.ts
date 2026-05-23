import type { InterceptNode, ElementNode, TextNode, InterceptConfig } from "../types/index";
import { generateUid } from "../utils/index";

// Tags we never capture — they are not layout elements
const DEFAULT_SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "META",
  "LINK",
  "HEAD",
  "NOSCRIPT",
  "TEMPLATE",
]);

/**
 * Captures the live DOM subtree rooted at `root` into an InterceptNode tree.
 *
 * - Assigns a uid to every element node (reads existing data-uid if present,
 *   generates one otherwise and writes it back to the live DOM element).
 * - Stores a domRef on every node pointing at the live DOM node.
 * - Does NOT mutate any styles, attributes, or structure.
 * - Returns the root InterceptNode and a map of uid → live Element
 *   so the caller can build its index immediately.
 */
export function captureTree(
  root: Element,
  config: Required<Pick<InterceptConfig, "uidAttribute" | "skipTags">>
): ElementNode {
  const skipTags = new Set([
    ...DEFAULT_SKIP_TAGS,
    ...config.skipTags.map((t) => t.toUpperCase()),
  ]);

  return captureElement(root, 0, skipTags, config.uidAttribute);
}

// ─────────────────────────────────────────────
// Internal
// ─────────────────────────────────────────────

function captureElement(
  el: Element,
  originalIndex: number,
  skipTags: Set<string>,
  uidAttr: string
): ElementNode {
  // Assign / read UID
  let uid = el.getAttribute(uidAttr);
  if (!uid) {
    uid = generateUid();
    el.setAttribute(uidAttr, uid);
  }

  // Capture attributes (excluding the uid attribute itself to avoid redundancy)
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name !== uidAttr) {
      attributes[attr.name] = attr.value;
    }
  }

  // Capture computed inline styles only.
  // We capture inline styles (el.style) rather than computed styles because:
  // 1. Computed styles include browser defaults — too noisy.
  // 2. Our restyle patches write inline styles, so diffing against inline
  //    styles is the correct baseline for reconciliation.
  const styles = captureInlineStyles(el);

  // Determine initial visibility
  // An element is "initially hidden" if its inline display is 'none'
  // OR if it has a hidden attribute. We do NOT read computed styles here
  // to avoid capturing stylesheet-driven visibility, which is the source's
  // responsibility, not ours.
  const initiallyHidden =
    (el as HTMLElement).style?.display === "none" ||
    el.hasAttribute("hidden");

  // Capture children
  const children: InterceptNode[] = [];
  let childIndex = 0;

  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as Element;
      if (!skipTags.has(childEl.tagName)) {
        children.push(captureElement(childEl, childIndex, skipTags, uidAttr));
        childIndex++;
      }
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? "";
      // Skip whitespace-only text nodes — they are invisible and
      // capturing them would bloat the tree and complicate reordering.
      if (text.trim().length > 0) {
        const textUid = generateUid();
        const textNode: TextNode = {
          uid: textUid,
          nodeType: "text",
          textContent: text,
          domRef: child as Text,
        };
        children.push(textNode);
        childIndex++;
      }
    }
  }

  const node: ElementNode = {
    uid,
    nodeType: "element",
    tag: el.tagName.toLowerCase(),
    attributes,
    styles,
    children,
    originalIndex,
    initiallyHidden,
    domRef: el,
  };

  return node;
}

function captureInlineStyles(el: Element): Record<string, string> {
  const styles: Record<string, string> = {};
  const htmlEl = el as HTMLElement;

  if (!htmlEl.style) return styles;

  for (let i = 0; i < htmlEl.style.length; i++) {
    const prop = htmlEl.style.item(i);
    if (prop) {
      styles[prop] = htmlEl.style.getPropertyValue(prop);
    }
  }

  return styles;
}
