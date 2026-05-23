import type { Patch, PatchStore } from "../types/index";

/**
 * createPatchStore
 *
 * An ordered, serializable collection of patch operations.
 *
 * Design decisions:
 * - Patches are stored in insertion order. The engine applies them
 *   in this order, so later patches win on conflict.
 * - The store is intentionally framework-agnostic — it holds data only.
 *   Triggering re-renders after mutations is the caller's responsibility.
 * - Serialization uses JSON. The store trusts that hydrated data is
 *   structurally valid; callers should validate before hydrating if
 *   the source is untrusted (e.g. localStorage from an old version).
 */
export function createPatchStore(): PatchStore {
  let patches: Patch[] = [];

  return {
    /**
     * Appends a patch to the store.
     * If a patch with the same id already exists, it is replaced in place
     * to support idempotent adds (useful for undo/redo stacks).
     */
    add(patch: Patch): void {
      const existingIndex = patches.findIndex((p) => p.id === patch.id);
      if (existingIndex !== -1) {
        patches[existingIndex] = patch;
      } else {
        patches.push(patch);
      }
    },

    /**
     * Removes a patch by id.
     * Returns true if a patch was removed, false if not found.
     */
    remove(id: string): boolean {
      const before = patches.length;
      patches = patches.filter((p) => p.id !== id);
      return patches.length < before;
    },

    /**
     * Returns a shallow copy of all patches in insertion order.
     * Callers receive a copy so they cannot mutate store internals.
     */
    getAll(): Patch[] {
      return [...patches];
    },

    /**
     * Removes all patches.
     */
    clear(): void {
      patches = [];
    },

    /**
     * Serializes the patch list to a JSON string.
     * Safe to write to localStorage or send over the wire.
     */
    serialize(): string {
      return JSON.stringify(patches);
    },

    /**
     * Replaces the current patch list with one deserialized from a JSON string.
     * Throws if the string is not valid JSON or not an array.
     * Does NOT validate individual patch shapes — caller's responsibility.
     */
    hydrate(json: string): void {
      const parsed: unknown = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        throw new Error(
          `[InterceptJS] PatchStore.hydrate: expected JSON array, got ${typeof parsed}`
        );
      }
      patches = parsed as Patch[];
    },
  };
}
