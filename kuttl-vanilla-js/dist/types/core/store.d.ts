import type { PatchStore } from "../types/index";
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
export declare function createPatchStore(): PatchStore;
