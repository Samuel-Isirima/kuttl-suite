import { describe, it, expect, beforeEach } from "vitest";
import {
  generateUid,
  _resetUidCounter,
  deepClone,
  buildUidIndex,
  findParent,
  isAncestor,
  clamp,
} from "../src/utils/index";
import type { ElementNode, TextNode } from "../src/types/index";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function makeEl(uid: string, children: (ElementNode | TextNode)[] = []): ElementNode {
  return {
    uid,
    nodeType: "element",
    tag: "div",
    attributes: {},
    styles: {},
    children,
    originalIndex: 0,
    initiallyHidden: false,
    domRef: document.createElement("div"),
  };
}

function makeText(uid: string): TextNode {
  return {
    uid,
    nodeType: "text",
    textContent: "hello",
    domRef: document.createTextNode("hello"),
  };
}

// ─────────────────────────────────────────────
// generateUid
// ─────────────────────────────────────────────

describe("generateUid", () => {
  beforeEach(() => _resetUidCounter());

  it("generates unique ids", () => {
    const a = generateUid();
    const b = generateUid();
    expect(a).not.toBe(b);
  });

  it("starts from icp-1 after reset", () => {
    expect(generateUid()).toBe("icp-1");
  });

  it("increments monotonically", () => {
    expect(generateUid()).toBe("icp-1");
    expect(generateUid()).toBe("icp-2");
    expect(generateUid()).toBe("icp-3");
  });
});

// ─────────────────────────────────────────────
// deepClone
// ─────────────────────────────────────────────

describe("deepClone", () => {
  it("clones element node without sharing children array", () => {
    const child = makeEl("child");
    const parent = makeEl("parent", [child]);
    const cloned = deepClone(parent) as ElementNode;

    expect(cloned).not.toBe(parent);
    expect(cloned.children).not.toBe(parent.children);
    expect(cloned.children[0]).not.toBe(child);
  });

  it("shares domRef between original and clone", () => {
    const node = makeEl("a");
    const cloned = deepClone(node) as ElementNode;
    expect(cloned.domRef).toBe(node.domRef);
  });

  it("clones text nodes correctly", () => {
    const text = makeText("t1");
    const cloned = deepClone(text) as TextNode;
    expect(cloned).not.toBe(text);
    expect(cloned.textContent).toBe("hello");
    expect(cloned.domRef).toBe(text.domRef); // domRef shared
  });

  it("deep clones nested children", () => {
    const grandchild = makeEl("gc");
    const child = makeEl("c", [grandchild]);
    const root = makeEl("r", [child]);
    const cloned = deepClone(root) as ElementNode;

    const clonedChild = cloned.children[0] as ElementNode;
    const clonedGrandchild = clonedChild.children[0] as ElementNode;

    expect(clonedGrandchild).not.toBe(grandchild);
    expect(clonedGrandchild.uid).toBe("gc");
  });

  it("clones styles without sharing reference", () => {
    const node = makeEl("a");
    node.styles = { color: "red" };
    const cloned = deepClone(node) as ElementNode;
    cloned.styles.color = "blue";
    expect(node.styles.color).toBe("red");
  });
});

// ─────────────────────────────────────────────
// buildUidIndex
// ─────────────────────────────────────────────

describe("buildUidIndex", () => {
  it("indexes all nodes in a tree", () => {
    const child1 = makeEl("c1");
    const child2 = makeText("c2");
    const root = makeEl("root", [child1, child2]);

    const index = buildUidIndex(root);

    expect(index.has("root")).toBe(true);
    expect(index.has("c1")).toBe(true);
    expect(index.has("c2")).toBe(true);
    expect(index.size).toBe(3);
  });

  it("returns node references, not copies", () => {
    const child = makeEl("c1");
    const root = makeEl("root", [child]);
    const index = buildUidIndex(root);

    expect(index.get("c1")).toBe(child);
  });
});

// ─────────────────────────────────────────────
// findParent
// ─────────────────────────────────────────────

describe("findParent", () => {
  it("finds the direct parent of a child", () => {
    const child = makeEl("child");
    const parent = makeEl("parent", [child]);
    const root = makeEl("root", [parent]);

    expect(findParent(root, "child")).toBe(parent);
  });

  it("returns null for the root node", () => {
    const root = makeEl("root");
    expect(findParent(root, "root")).toBeNull();
  });

  it("returns null for a uid not in the tree", () => {
    const root = makeEl("root");
    expect(findParent(root, "ghost")).toBeNull();
  });
});

// ─────────────────────────────────────────────
// isAncestor
// ─────────────────────────────────────────────

describe("isAncestor", () => {
  it("returns true when ancestorUid contains targetUid", () => {
    const grandchild = makeEl("gc");
    const child = makeEl("child", [grandchild]);
    const root = makeEl("root", [child]);

    expect(isAncestor(root, "child", "gc")).toBe(true);
    expect(isAncestor(root, "root", "gc")).toBe(true);
  });

  it("returns false when targetUid is not inside ancestorUid", () => {
    const child = makeEl("child");
    const sibling = makeEl("sibling");
    const root = makeEl("root", [child, sibling]);

    expect(isAncestor(root, "child", "sibling")).toBe(false);
  });

  it("returns false for non-existent uids", () => {
    const root = makeEl("root");
    expect(isAncestor(root, "ghost", "also-ghost")).toBe(false);
  });
});

// ─────────────────────────────────────────────
// clamp
// ─────────────────────────────────────────────

describe("clamp", () => {
  it("clamps below min", () => expect(clamp(-5, 0, 10)).toBe(0));
  it("clamps above max", () => expect(clamp(15, 0, 10)).toBe(10));
  it("passes through values in range", () => expect(clamp(5, 0, 10)).toBe(5));
  it("handles equal min and max", () => expect(clamp(3, 5, 5)).toBe(5));
});
