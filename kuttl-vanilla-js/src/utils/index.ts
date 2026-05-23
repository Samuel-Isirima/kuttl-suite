import type { InterceptNode, ElementNode } from "../types/index";

// ─────────────────────────────────────────────
// UID generation
// ─────────────────────────────────────────────

let _counter = 0;

/**
 * Generates a stable, unique ID for a DOM node.
 * Resets on every page load (counter starts at 0).
 */
export function generateUid(): string {
  return `icp-${++_counter}`;
}

/**
 * Resets the counter. Only used in tests.
 */
export function _resetUidCounter(): void {
  _counter = 0;
}

// ─────────────────────────────────────────────
// Deep clone
// ─────────────────────────────────────────────

/**
 * Deep clones an InterceptNode tree.
 * domRef is intentionally shared — both trees point to the same live DOM node.
 * We never mutate domRef through the working tree; it's only read during reconciliation.
 */
export function deepClone(node: InterceptNode): InterceptNode {
  if (node.nodeType === "text") {
    return { ...node };
  }

  return {
    ...node,
    attributes: { ...node.attributes },
    styles: { ...node.styles },
    children: node.children.map(deepClone),
  };
}

// ─────────────────────────────────────────────
// Flat UID index
// ─────────────────────────────────────────────

/**
 * Builds a flat map of uid → node for O(1) lookup.
 * Must be rebuilt after every patch application.
 */
export function buildUidIndex(
  root: InterceptNode,
  index: Map<string, InterceptNode> = new Map()
): Map<string, InterceptNode> {
  index.set(root.uid, root);

  if (root.nodeType === "element") {
    for (const child of root.children) {
      buildUidIndex(child, index);
    }
  }

  return index;
}

/**
 * Finds the parent of a node by uid within a tree.
 * Returns null if the node is the root or not found.
 */
export function findParent(
  root: ElementNode,
  targetUid: string
): ElementNode | null {
  for (const child of root.children) {
    if (child.uid === targetUid) return root;

    if (child.nodeType === "element") {
      const found = findParent(child, targetUid);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Checks whether `ancestorUid` is an ancestor of `targetUid` in the given tree.
 * Used to detect circular move operations.
 */
export function isAncestor(
  tree: InterceptNode,
  ancestorUid: string,
  targetUid: string
): boolean {
  // Walk the subtree rooted at ancestorUid and see if targetUid is inside it
  const ancestor = findByUid(tree, ancestorUid);
  if (!ancestor || ancestor.nodeType !== "element") return false;
  return containsUid(ancestor, targetUid);
}

function findByUid(node: InterceptNode, uid: string): InterceptNode | null {
  if (node.uid === uid) return node;
  if (node.nodeType === "element") {
    for (const child of node.children) {
      const found = findByUid(child, uid);
      if (found) return found;
    }
  }
  return null;
}

function containsUid(node: ElementNode, uid: string): boolean {
  for (const child of node.children) {
    if (child.uid === uid) return true;
    if (child.nodeType === "element" && containsUid(child, uid)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────

/**
 * Clamps a number between min and max inclusive.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generates a random UUID for patch IDs.
 */
export function generatePatchId(): string {
  return crypto.randomUUID();
}
