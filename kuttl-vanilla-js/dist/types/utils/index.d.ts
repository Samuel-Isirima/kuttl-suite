import type { InterceptNode, ElementNode } from "../types/index";
/**
 * Generates a stable, unique ID for a DOM node.
 * Resets on every page load (counter starts at 0).
 */
export declare function generateUid(): string;
/**
 * Resets the counter. Only used in tests.
 */
export declare function _resetUidCounter(): void;
/**
 * Deep clones an InterceptNode tree.
 * domRef is intentionally shared — both trees point to the same live DOM node.
 * We never mutate domRef through the working tree; it's only read during reconciliation.
 */
export declare function deepClone(node: InterceptNode): InterceptNode;
/**
 * Builds a flat map of uid → node for O(1) lookup.
 * Must be rebuilt after every patch application.
 */
export declare function buildUidIndex(root: InterceptNode, index?: Map<string, InterceptNode>): Map<string, InterceptNode>;
/**
 * Finds the parent of a node by uid within a tree.
 * Returns null if the node is the root or not found.
 */
export declare function findParent(root: ElementNode, targetUid: string): ElementNode | null;
/**
 * Checks whether `ancestorUid` is an ancestor of `targetUid` in the given tree.
 * Used to detect circular move operations.
 */
export declare function isAncestor(tree: InterceptNode, ancestorUid: string, targetUid: string): boolean;
/**
 * Clamps a number between min and max inclusive.
 */
export declare function clamp(value: number, min: number, max: number): number;
/**
 * Generates a random UUID for patch IDs.
 */
export declare function generatePatchId(): string;
