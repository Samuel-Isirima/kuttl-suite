import type { InterceptNode } from "../types/index";
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
export declare function reconcile(oldTree: InterceptNode, newTree: InterceptNode, debug?: boolean): void;
