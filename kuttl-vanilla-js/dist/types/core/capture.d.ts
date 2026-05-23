import type { ElementNode, InterceptConfig } from "../types/index";
/**
 * Captures the live DOM subtree rooted at `root` into an InterceptNode tree.
 *
 * - Assigns a uid to every element node (reads existing data-uid if present,
 *   generates one otherwise and writes it back to the live DOM element).
 * - Stores a domRef on every node pointing at the live DOM node.
 * - Does NOT mutate any styles, attributes, or structure.
 * - Returns the root InterceptNode and a map of uid → live Element
 *   so the caller can build its index immediately.
 */
export declare function captureTree(root: Element, config: Required<Pick<InterceptConfig, "uidAttribute" | "skipTags">>): ElementNode;
