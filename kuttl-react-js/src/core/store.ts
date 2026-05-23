import type { Patch } from "../types/index.js";

export interface PatchStore {
  add(patch: Patch): void;
  remove(id: string): boolean;
  getAll(): Patch[];
  clear(): void;
  serialize(): string;
  hydrate(json: string): void;
}

export function createPatchStore(): PatchStore {
  let patches: Patch[] = [];

  return {
    add(patch) {
      const idx = patches.findIndex((p) => p.id === patch.id);
      if (idx !== -1) patches[idx] = patch;
      else patches.push(patch);
    },
    remove(id) {
      const before = patches.length;
      patches = patches.filter((p) => p.id !== id);
      return patches.length < before;
    },
    getAll() { return [...patches]; },
    clear()  { patches = []; },
    serialize() { return JSON.stringify(patches); },
    hydrate(json) {
      const parsed: unknown = JSON.parse(json);
      if (!Array.isArray(parsed)) throw new Error("[Cuttlefish] hydrate: expected array");
      patches = parsed as Patch[];
    },
  };
}

export function generatePatchId(): string {
  return crypto.randomUUID();
}
