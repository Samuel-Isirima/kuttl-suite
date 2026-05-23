import { describe, it, expect, beforeEach } from "vitest";
import { createPatchStore } from "../src/core/store";
import type { Patch, RestylePatch } from "../src/types/index";

function makeRestyle(id: string): RestylePatch {
  return {
    id,
    op: "restyle",
    target: "uid-1",
    timestamp: 1000,
    source: "manual",
    payload: { styles: { color: "red" } },
  };
}

describe("PatchStore", () => {
  let store: ReturnType<typeof createPatchStore>;

  beforeEach(() => {
    store = createPatchStore();
  });

  it("starts empty", () => {
    expect(store.getAll()).toHaveLength(0);
  });

  it("adds a patch", () => {
    store.add(makeRestyle("p1"));
    expect(store.getAll()).toHaveLength(1);
  });

  it("getAll returns a copy, not the internal array", () => {
    store.add(makeRestyle("p1"));
    const all = store.getAll();
    all.push(makeRestyle("p2"));
    expect(store.getAll()).toHaveLength(1);
  });

  it("replaces existing patch with same id (idempotent add)", () => {
    const p1 = makeRestyle("p1");
    const p1Updated: RestylePatch = {
      ...p1,
      payload: { styles: { color: "blue" } },
    };

    store.add(p1);
    store.add(p1Updated);

    const all = store.getAll();
    expect(all).toHaveLength(1);
    expect((all[0] as RestylePatch).payload.styles.color).toBe("blue");
  });

  it("removes a patch by id and returns true", () => {
    store.add(makeRestyle("p1"));
    const result = store.remove("p1");
    expect(result).toBe(true);
    expect(store.getAll()).toHaveLength(0);
  });

  it("returns false when removing a non-existent id", () => {
    expect(store.remove("ghost")).toBe(false);
  });

  it("preserves insertion order", () => {
    store.add(makeRestyle("p1"));
    store.add(makeRestyle("p2"));
    store.add(makeRestyle("p3"));
    const ids = store.getAll().map((p) => p.id);
    expect(ids).toEqual(["p1", "p2", "p3"]);
  });

  it("clear removes all patches", () => {
    store.add(makeRestyle("p1"));
    store.add(makeRestyle("p2"));
    store.clear();
    expect(store.getAll()).toHaveLength(0);
  });

  it("serializes and hydrates correctly", () => {
    store.add(makeRestyle("p1"));
    store.add(makeRestyle("p2"));

    const json = store.serialize();
    const store2 = createPatchStore();
    store2.hydrate(json);

    expect(store2.getAll()).toHaveLength(2);
    expect(store2.getAll()[0]?.id).toBe("p1");
  });

  it("hydrate throws on invalid JSON", () => {
    expect(() => store.hydrate("not json")).toThrow();
  });

  it("hydrate throws if JSON is not an array", () => {
    expect(() => store.hydrate('{"foo":"bar"}')).toThrow(
      /expected JSON array/
    );
  });
});
