import type { InterceptNode, ElementNode, TextNode } from "../types/index";

/**
 * reconcile
 *
 * Surgically updates the live DOM to match the new working tree,
 * using the old working tree as the previous state baseline.
 *
 * Design principles:
 * - Never tears down and rebuilds. Diffs node-by-node.
 * - Uses domRef stored on each node — no querySelector at reconcile time.
 * - Batches style writes to minimise reflows where possible.
 * - Preserves focus, scroll position, and input values across moves.
 *
 * Limitations:
 * - If a node's tag changes between trees, it is replaced entirely
 *   (different tag = different element; no meaningful diff possible).
 * - Nodes whose domRef is no longer in the document are skipped with a warning.
 */
export function reconcile(
  oldTree: InterceptNode,
  newTree: InterceptNode,
  debug: boolean = false
): void {
  reconcileNode(oldTree, newTree, debug);
}

// ─────────────────────────────────────────────
// Node-level reconciliation
// ─────────────────────────────────────────────

function reconcileNode(
  oldNode: InterceptNode,
  newNode: InterceptNode,
  debug: boolean
): void {
  // Both are text nodes
  if (oldNode.nodeType === "text" && newNode.nodeType === "text") {
    reconcileText(oldNode, newNode);
    return;
  }

  // Both are element nodes
  if (oldNode.nodeType === "element" && newNode.nodeType === "element") {
    reconcileElement(oldNode, newNode, debug);
    return;
  }

  // Mixed types — should not happen if engine is correct
  log(debug, `reconcileNode: node type mismatch for uid "${oldNode.uid}". Skipping.`);
}

// ─────────────────────────────────────────────
// Text reconciliation
// ─────────────────────────────────────────────

function reconcileText(oldNode: TextNode, newNode: TextNode): void {
  if (oldNode.textContent !== newNode.textContent) {
    newNode.domRef.textContent = newNode.textContent;
  }
}

// ─────────────────────────────────────────────
// Element reconciliation
// ─────────────────────────────────────────────

function reconcileElement(
  oldNode: ElementNode,
  newNode: ElementNode,
  debug: boolean
): void {
  const el = newNode.domRef as HTMLElement;

  // Guard: element must still be in the document
  if (!document.contains(el)) {
    log(debug, `reconcile: domRef for uid "${newNode.uid}" is no longer in the document. Skipping.`);
    return;
  }

  // Tag change — replace the element entirely (rare but must be handled)
  if (oldNode.tag !== newNode.tag) {
    replaceElement(oldNode, newNode, debug);
    return;
  }

  // Diff and apply attribute changes
  reconcileAttributes(oldNode, newNode, el);

  // Diff and apply style changes
  reconcileStyles(oldNode, newNode, el);

  // Diff and reconcile children (handles reorder + move)
  reconcileChildren(oldNode, newNode, el, debug);
}

// ─────────────────────────────────────────────
// Attributes
// ─────────────────────────────────────────────

function reconcileAttributes(
  oldNode: ElementNode,
  newNode: ElementNode,
  el: HTMLElement
): void {
  const oldAttrs = oldNode.attributes;
  const newAttrs = newNode.attributes;

  // Set new or changed attributes
  for (const [key, value] of Object.entries(newAttrs)) {
    if (oldAttrs[key] !== value) {
      el.setAttribute(key, value);
    }
  }

  // Remove attributes that no longer exist
  for (const key of Object.keys(oldAttrs)) {
    if (!(key in newAttrs)) {
      el.removeAttribute(key);
    }
  }
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

function reconcileStyles(
  oldNode: ElementNode,
  newNode: ElementNode,
  el: HTMLElement
): void {
  const oldStyles = oldNode.styles;
  const newStyles = newNode.styles;

  // Apply new or changed properties
  for (const [prop, value] of Object.entries(newStyles)) {
    if (oldStyles[prop] !== value) {
      el.style.setProperty(prop, value);
    }
  }

  // Remove properties that are no longer in the working tree
  for (const prop of Object.keys(oldStyles)) {
    if (!(prop in newStyles)) {
      el.style.removeProperty(prop);
    }
  }
}

// ─────────────────────────────────────────────
// Children (the hard part)
// ─────────────────────────────────────────────

function reconcileChildren(
  oldNode: ElementNode,
  newNode: ElementNode,
  parentEl: HTMLElement,
  debug: boolean
): void {
  const oldChildren = oldNode.children;
  const newChildren = newNode.children;

  // Build old uid → node map
  const oldMap = new Map<string, InterceptNode>();
  for (const child of oldChildren) {
    oldMap.set(child.uid, child);
  }

  // ── Pass 1: Remove children that no longer exist in the new tree ──
  const newUids = new Set(newChildren.map((c) => c.uid));
  for (const oldChild of oldChildren) {
    if (!newUids.has(oldChild.uid)) {
      const domNode = oldChild.domRef;
      if (domNode.parentNode === parentEl) {
        // Save scroll state if it's a scrollable element
        const saved = saveScrollState(domNode);
        parentEl.removeChild(domNode);
        // Restore will happen if element is re-inserted (move op)
        // Store on the node for potential re-use
        if (saved && oldChild.nodeType === "element") {
          (oldChild as ElementNode & { _savedScroll?: ScrollState }).
            _savedScroll = saved;
        }
      }
    }
  }

  // ── Pass 2: Insert/move children into correct positions ──
  // Walk new children left-to-right and ensure each is at the correct
  // DOM position using insertBefore. This handles insertions, moves, and
  // reorders in a single pass without needing to know exact old positions.

  for (let i = 0; i < newChildren.length; i++) {
    const newChild = newChildren[i];
    if (!newChild) continue;

    const domNode = newChild.domRef;
    const oldChild = oldMap.get(newChild.uid);

    // Determine the reference node (the DOM node that should come after this one)
    // We want to insertBefore the i+1th child's domRef.
    const nextSibling = findNextSiblingDomRef(newChildren, i + 1, parentEl);

    // If the child is not in the right position (or not in the parent at all),
    // move it. insertBefore is idempotent when the node is already a child —
    // it will be moved to the new position.
    const currentNextSibling = domNode.nextSibling;
    const isAtCorrectPosition =
      domNode.parentNode === parentEl && currentNextSibling === nextSibling;

    if (!isAtCorrectPosition) {
      // Preserve focus if this element or a descendant has it
      const focused = getFocusedDescendant(domNode);
      // Preserve scroll state
      const scrollState = domNode.nodeType === Node.ELEMENT_NODE
        ? saveScrollState(domNode)
        : null;
      // Preserve input value
      const inputValue = getInputValue(domNode);

      parentEl.insertBefore(domNode, nextSibling);

      if (focused && document.activeElement !== focused) {
        (focused as HTMLElement).focus?.();
      }
      if (scrollState) restoreScrollState(domNode, scrollState);
      if (inputValue !== null) setInputValue(domNode, inputValue);
    }

    // ── Pass 3: Recurse to reconcile this child's internals ──
    if (oldChild) {
      reconcileNode(oldChild, newChild, debug);
    }
    // If oldChild is undefined, the child is new — its DOM is already correct
    // since it was just created by the page's own JS/HTML. No further action needed.
  }
}

// ─────────────────────────────────────────────
// Element replacement (tag changed)
// ─────────────────────────────────────────────

function replaceElement(
  oldNode: ElementNode,
  newNode: ElementNode,
  _debug: boolean
): void {
  const oldEl = oldNode.domRef as HTMLElement;
  const parent = oldEl.parentNode;
  if (!parent) return;

  const newEl = document.createElement(newNode.tag);

  // Apply attributes
  for (const [key, value] of Object.entries(newNode.attributes)) {
    newEl.setAttribute(key, value);
  }
  // Apply styles
  for (const [prop, value] of Object.entries(newNode.styles)) {
    newEl.style.setProperty(prop, value);
  }

  // Move children into new element
  while (oldEl.firstChild) {
    newEl.appendChild(oldEl.firstChild);
  }

  parent.replaceChild(newEl, oldEl);

  // Update the domRef on the working tree node so future reconciles work
  newNode.domRef = newEl;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Returns the domRef of the next sibling in the newChildren array
 * starting at `fromIndex`, or null if there is none.
 * Used as the `referenceNode` for insertBefore.
 *
 * IMPORTANT: only returns a node that is currently a child of `parentEl`.
 * After a move patch, a sibling's domRef may have been relocated to a
 * different parent — using it as a reference would throw
 * "The node before which the new node is to be inserted is not a child
 * of this node." We skip any sibling not currently under parentEl and
 * look further; if none qualify we return null (append to end).
 */
function findNextSiblingDomRef(
  children: InterceptNode[],
  fromIndex: number,
  parentEl: Element
): Node | null {
  for (let i = fromIndex; i < children.length; i++) {
    const child = children[i];
    if (child && child.domRef.parentNode === parentEl) {
      return child.domRef;
    }
  }
  return null;
}

/**
 * Returns the focused element if it is a descendant of `node`, else null.
 */
function getFocusedDescendant(node: Node): Element | null {
  const active = document.activeElement;
  if (!active || active === document.body) return null;
  if (node.contains(active)) return active;
  return null;
}

// ─────────────────────────────────────────────
// Scroll state preservation
// ─────────────────────────────────────────────

interface ScrollState {
  top: number;
  left: number;
}

function saveScrollState(node: Node): ScrollState | null {
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  if (el.scrollTop === 0 && el.scrollLeft === 0) return null;
  return { top: el.scrollTop, left: el.scrollLeft };
}

function restoreScrollState(node: Node, state: ScrollState): void {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  el.scrollTop = state.top;
  el.scrollLeft = state.left;
}

// ─────────────────────────────────────────────
// Input value preservation
// ─────────────────────────────────────────────

function getInputValue(node: Node): string | null {
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as HTMLElement;
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    return el.value;
  }
  return null;
}

function setInputValue(node: Node, value: string): void {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    el.value = value;
  }
}

// ─────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────

function log(debug: boolean, message: string): void {
  if (debug) console.warn(`[InterceptJS]`, message);
}