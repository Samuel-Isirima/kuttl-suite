import type { InterceptNode, Patch } from "../types/index";
export declare function applyPatches(sourceSnapshot: InterceptNode, patches: Patch[], domRoot?: Element): {
    tree: InterceptNode;
    warnings: string[];
    enhancedPatches: Patch[];
};
export declare function generateSemanticPatches(tree: InterceptNode, operation: string, targetUid: string, domRoot?: Element): Patch[];
