import type { InterceptNode, Patch } from "../types/index";
export interface PreviewResult {
    success: boolean;
    previewTree: InterceptNode;
    warnings: string[];
    layoutIssues: LayoutIssue[];
    previewDescription: string;
    enhancedPatches: Patch[];
}
export interface LayoutIssue {
    severity: "warning" | "error";
    message: string;
    affectedElement: string;
    suggestedFix?: string;
}
export declare class PatchPreview {
    /**
     * Performs a dry-run of patches to preview their effect
     * without actually applying them to the live DOM
     */
    previewPatches(tree: InterceptNode, patches: Patch[], domRoot?: Element): PreviewResult;
    /**
     * Detects potential layout issues by comparing before/after states
     */
    private detectLayoutIssues;
    private analyzeHideIssues;
    private analyzeStyleIssues;
    private analyzeMoveIssues;
    private findElementInTree;
    private generatePreviewDescription;
    /**
     * Generates a visual diff summary for debugging
     */
    generateVisualDiff(originalTree: InterceptNode, previewTree: InterceptNode): string;
    private walkTreeComparison;
}
export declare function createPatchPreview(): PatchPreview;
export declare function previewPatches(tree: InterceptNode, patches: Patch[], domRoot?: Element): PreviewResult;
