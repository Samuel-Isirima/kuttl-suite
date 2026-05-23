import type { Patch, OverrideIndex } from "../types/index.js";
/**
 * buildOverrideIndex
 *
 * Collapses an ordered patch list into a flat map of uid → ResolvedOverrides.
 * This is the React adapter's equivalent of the vanilla engine's applyPatches —
 * instead of mutating a DOM tree, it produces a data structure that React
 * components read during render.
 *
 * Later patches win on conflict (same semantics as the vanilla engine).
 * Called every time the patch list changes; result is stored in React state
 * so components re-render automatically.
 */
export declare function buildOverrideIndex(patches: Patch[]): OverrideIndex;
