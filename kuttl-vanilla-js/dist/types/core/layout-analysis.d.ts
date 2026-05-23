import type { InterceptNode, ElementNode, Patch } from "../types/index";
export interface LayoutContext {
    safe: boolean;
    parentDisplay: string;
    needsParentPatch: boolean;
    suggestedFixes: Patch[];
    warnings: string[];
    isLayoutContainer: boolean;
    childrenUids: string[];
    affectedElements: string[];
}
export interface LayoutImpactAnalysis {
    canApplySafely: boolean;
    requiredAdditionalPatches: Patch[];
    warnings: string[];
    previewDescription?: string;
}
export declare class LayoutAnalyzer {
    /**
     * Analyzes the layout impact of applying a patch to understand
     * what additional changes might be needed to prevent breaking the layout
     */
    analyzeLayoutImpact(tree: InterceptNode, patch: Patch, domRoot?: Element): LayoutImpactAnalysis;
    /**
     * Captures layout context for an element
     */
    private analyzeLayoutContext;
    /**
     * Analyzes the impact of hiding an element
     */
    private analyzeHideOperation;
    /**
     * Analyzes the impact of showing an element
     */
    private analyzeShowOperation;
    /**
     * Analyzes the impact of moving an element
     */
    private analyzeMoveOperation;
    /**
     * Analyzes the impact of restyling an element
     */
    private analyzeRestyleOperation;
    /**
     * Generates compound patches for common layout operations
     */
    generateCompoundPatch(operation: string, targetUid: string, context: LayoutContext): Patch[];
    private findParent;
    private getDisplayValue;
    private isLayoutContainer;
    private getParentUid;
}
/**
 * Detects common layout patterns and provides semantic operations
 */
export declare class LayoutPatternDetector {
    detectLayoutPattern(element: ElementNode, context: LayoutContext): string | null;
    getSemanticOperation(pattern: string, operation: string): string | null;
}
export declare function createLayoutAnalyzer(): LayoutAnalyzer;
export declare function createLayoutPatternDetector(): LayoutPatternDetector;
