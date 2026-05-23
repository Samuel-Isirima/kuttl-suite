import type {
  Patch,
  ResolvedOverrides,
  OverrideIndex,
} from "../types/index.js";

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
export function buildOverrideIndex(patches: Patch[]): OverrideIndex {
  const index: OverrideIndex = new Map();

  function get(uid: string): ResolvedOverrides {
    if (!index.has(uid)) index.set(uid, {});
    return index.get(uid)!;
  }

  for (const patch of patches) {
    const override = get(patch.target);

    switch (patch.op) {
      case "restyle":
        override.styles = { ...(override.styles ?? {}), ...patch.payload.styles };
        break;

      case "hide":
        override.hidden = true;
        break;

      case "show":
        override.hidden = false;
        break;

      case "addClass": {
        const existing = override.classesToAdd ?? [];
        override.classesToAdd = [
          ...existing,
          ...patch.payload.classes.filter((c) => !existing.includes(c)),
        ];
        // If a class was previously scheduled for removal, un-remove it
        if (override.classesToRemove) {
          override.classesToRemove = override.classesToRemove.filter(
            (c) => !patch.payload.classes.includes(c)
          );
        }
        break;
      }

      case "removeClass": {
        const existing = override.classesToRemove ?? [];
        override.classesToRemove = [
          ...existing,
          ...patch.payload.classes.filter((c) => !existing.includes(c)),
        ];
        // If a class was previously scheduled to be added, un-add it
        if (override.classesToAdd) {
          override.classesToAdd = override.classesToAdd.filter(
            (c) => !patch.payload.classes.includes(c)
          );
        }
        break;
      }

      case "setText":
        override.text = patch.payload.text;
        break;

      case "reorder":
        // Store the desired child order — consumed by useCuttlefish().reorder()
        override.order = patch.payload.order;
        break;

      case "move":
        // Mark target as moved and record destination
        override.moved = true;
        // Also mark the destination parent as needing to receive this child
        get(patch.payload.newParent);
        break;
    }
  }

  return index;
}
