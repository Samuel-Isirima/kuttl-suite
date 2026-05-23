import { describe, it, expect, beforeEach } from "vitest";
import { applyPatches } from "../src/core/engine";
import { _resetUidCounter } from "../src/utils/index";
import type {
  ElementNode,
  TextNode,
  RestylePatch,
  ReorderPatch,
  MovePatch,
  HidePatch,
  ShowPatch,
  SetTextPatch,
} from "../src/types/index";

// ─────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────

function makeEl(
  uid: string,
  children: (ElementNode | TextNode)[] = [],
  styles: Record<string, string> = {}
): ElementNode {
  return {
    uid,
    nodeType: "element",
    tag: "div",
    attributes: {},
    styles,
    children,
    originalIndex: 0,
    initiallyHidden: false,
    domRef: document.createElement("div"),
  };
}

function makeText(uid: string, text = "hello"): TextNode {
  return {
    uid,
    nodeType: "text",
    textContent: text,
    domRef: document.createTextNode(text),
  };
}

function restyle(target: string, styles: Record<string, string>): RestylePatch {
  return { id: "p1", op: "restyle", target, timestamp: 0, source: "manual", payload: { styles } };
}

function reorder(target: string, order: string[]): ReorderPatch {
  return { id: "p1", op: "reorder", target, timestamp: 0, source: "manual", payload: { order } };
}

function move(target: string, newParent: string, index: number): MovePatch {
  return { id: "p1", op: "move", target, timestamp: 0, source: "manual", payload: { newParent, index } };
}

function hide(target: string): HidePatch {
  return { id: "p1", op: "hide", target, timestamp: 0, source: "manual", payload: {} };
}

function show(target: string): ShowPatch {
  return { id: "p1", op: "show", target, timestamp: 0, source: "manual", payload: {} };
}

function setText(target: string, text: string): SetTextPatch {
  return { id: "p1", op: "setText", target, timestamp: 0, source: "manual", payload: { text } };
}

// ─────────────────────────────────────────────
// Source snapshot is never mutated
// ─────────────────────────────────────────────

describe("applyPatches — immutability", () => {
  it("does not mutate the source snapshot", () => {
    const source = makeEl("root", [], { color: "blue" });
    applyPatches(source, [restyle("root", { color: "red" })]);
    expect(source.styles.color).toBe("blue");
  });
});

// ─────────────────────────────────────────────
// Restyle
// ─────────────────────────────────────────────

describe("restyle", () => {
  it("merges styles onto target element", () => {
    const source = makeEl("root", [], { color: "blue" });
    const { tree } = applyPatches(source, [restyle("root", { color: "red", fontSize: "16px" })]);
    expect((tree as ElementNode).styles.color).toBe("red");
    expect((tree as ElementNode).styles.fontSize).toBe("16px");
  });

  it("later patches win on same property", () => {
    const source = makeEl("root");
    const p1 = { ...restyle("root", { color: "red" }), id: "p1" };
    const p2 = { ...restyle("root", { color: "green" }), id: "p2" };
    const { tree } = applyPatches(source, [p1, p2]);
    expect((tree as ElementNode).styles.color).toBe("green");
  });

  it("warns when targeting a text node", () => {
    const text = makeText("t1");
    const source = makeEl("root", [text]);
    const { warnings } = applyPatches(source, [restyle("t1", { color: "red" })]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("warns when target uid not found", () => {
    const source = makeEl("root");
    const { warnings } = applyPatches(source, [restyle("ghost", { color: "red" })]);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// Reorder
// ─────────────────────────────────────────────

describe("reorder", () => {
  it("reorders children as specified", () => {
    const c1 = makeEl("c1");
    const c2 = makeEl("c2");
    const c3 = makeEl("c3");
    const source = makeEl("root", [c1, c2, c3]);

    const { tree } = applyPatches(source, [reorder("root", ["c3", "c1", "c2"])]);
    const children = (tree as ElementNode).children;
    expect(children.map((c) => c.uid)).toEqual(["c3", "c1", "c2"]);
  });

  it("appends unlisted children after listed ones", () => {
    const c1 = makeEl("c1");
    const c2 = makeEl("c2");
    const c3 = makeEl("c3");
    const source = makeEl("root", [c1, c2, c3]);

    const { tree } = applyPatches(source, [reorder("root", ["c3", "c1"])]);
    const children = (tree as ElementNode).children;
    expect(children.map((c) => c.uid)).toEqual(["c3", "c1", "c2"]);
  });

  it("warns when order contains non-child uids", () => {
    const source = makeEl("root", [makeEl("c1")]);
    const { warnings } = applyPatches(source, [reorder("root", ["ghost"])]);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// Move
// ─────────────────────────────────────────────

describe("move", () => {
  it("moves a node to a new parent at the specified index", () => {
    const target = makeEl("target");
    const dest = makeEl("dest");
    const source = makeEl("root", [target, dest]);

    const { tree } = applyPatches(source, [move("target", "dest", 0)]);
    const root = tree as ElementNode;

    // root should now have only dest
    expect(root.children.map((c) => c.uid)).toEqual(["dest"]);
    // dest should have target as first child
    expect((root.children[0] as ElementNode).children.map((c) => c.uid)).toEqual(["target"]);
  });

  it("clamps out-of-bounds index", () => {
    const target = makeEl("target");
    const dest = makeEl("dest", [makeEl("existing")]);
    const source = makeEl("root", [target, dest]);

    // index 999 should be clamped to the end
    const { tree, warnings } = applyPatches(source, [move("target", "dest", 999)]);
    const destNode = (tree as ElementNode).children[0] as ElementNode;
    expect(destNode.children[destNode.children.length - 1]?.uid).toBe("target");
    expect(warnings).toHaveLength(0);
  });

  it("rejects circular move", () => {
    const child = makeEl("child");
    const parent = makeEl("parent", [child]);
    const source = makeEl("root", [parent]);

    // Try to move parent into its own child
    const { warnings } = applyPatches(source, [move("parent", "child", 0)]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("rejects moving the root node", () => {
    const source = makeEl("root");
    const { warnings } = applyPatches(source, [move("root", "ghost", 0)]);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// Hide / Show
// ─────────────────────────────────────────────

describe("hide and show", () => {
  it("hide sets display:none on styles", () => {
    const source = makeEl("root");
    const { tree } = applyPatches(source, [hide("root")]);
    expect((tree as ElementNode).styles.display).toBe("none");
  });

  it("show removes display:none from styles", () => {
    const source = makeEl("root", [], { display: "none" });
    const { tree } = applyPatches(source, [show("root")]);
    expect((tree as ElementNode).styles.display).toBeUndefined();
  });

  it("show on a visible element is a no-op (no error)", () => {
    const source = makeEl("root", [], { color: "red" });
    const { tree, warnings } = applyPatches(source, [show("root")]);
    expect(warnings).toHaveLength(0);
    expect((tree as ElementNode).styles.color).toBe("red");
  });
});

// ─────────────────────────────────────────────
// SetText
// ─────────────────────────────────────────────

describe("setText", () => {
  it("updates text content of a text node", () => {
    const text = makeText("t1", "old text");
    const source = makeEl("root", [text]);
    const { tree } = applyPatches(source, [setText("t1", "new text")]);
    const textNode = (tree as ElementNode).children[0] as TextNode;
    expect(textNode.textContent).toBe("new text");
  });

  it("warns when targeting an element node", () => {
    const source = makeEl("root");
    const { warnings } = applyPatches(source, [setText("root", "text")]);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// Multiple patches
// ─────────────────────────────────────────────

describe("multiple patches", () => {
  it("applies patches in order", () => {
    const c1 = makeEl("c1");
    const c2 = makeEl("c2");
    const source = makeEl("root", [c1, c2]);

    const p1 = { ...restyle("root", { color: "red" }), id: "p1" };
    const p2 = { ...hide("c1"), id: "p2" };
    const p3 = { ...restyle("root", { color: "blue" }), id: "p3" };

    const { tree } = applyPatches(source, [p1, p2, p3]);
    const root = tree as ElementNode;

    expect(root.styles.color).toBe("blue"); // p3 wins over p1
    expect((root.children[0] as ElementNode).styles.display).toBe("none");
  });
});
