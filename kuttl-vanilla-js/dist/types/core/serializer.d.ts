import type { InterceptNode, Patch, InterceptConfig } from "../types/index";
import type { WebsiteSnapshot, SnapshotDiff } from "../types/serialization";
export declare class WebsiteSerializer {
    private config;
    private lastSnapshot;
    constructor(config?: Pick<InterceptConfig, "uidAttribute" | "descriptionAttribute">);
    /**
     * Creates a complete website snapshot from the current state
     */
    createSnapshot(interceptTree: InterceptNode, patches: Patch[], root: Element, websiteId: string, userId: string, sessionId: string, promptContext?: import('../types/serialization').PromptContext): WebsiteSnapshot;
    /**
     * Creates a diff between the current state and the last snapshot
     */
    createDiff(currentSnapshot: WebsiteSnapshot): SnapshotDiff | null;
    /**
     * Applies a diff to update the snapshot incrementally
     */
    applyDiff(baseSnapshot: WebsiteSnapshot, diff: SnapshotDiff): WebsiteSnapshot;
    private serializeComponents;
    private serializeComponent;
    private serializeElementNode;
    private captureVisualState;
    private captureInteractionCapabilities;
    private serializeStyles;
    private captureGlobalRules;
    private captureComponentStyles;
    private serializeLayout;
    private detectLayoutContainers;
    private serializeCustomizations;
    private createCustomizationHistory;
    private diffComponents;
    private diffStyles;
    private diffLayout;
    private diffCustomizations;
    private walkTree;
    private isElementVisible;
    private captureBoundingRect;
    private capturePosition;
    private captureDimensions;
    private captureColorPalette;
    private captureTypography;
    private captureVisualEffects;
    private createMetadata;
    private parsePixelValue;
    private captureComputedStyles;
    private detectSemanticRole;
    private captureAccessibilityInfo;
    private createEmptyRelationships;
    private populateRelationships;
    private isSelectable;
    private isFocusable;
    private isNativelyFocusable;
    private getSupportedEvents;
    private captureInteractionState;
    private getCustomizableProperties;
    private applyComponentDiff;
    private applyStyleDiff;
    private applyLayoutDiff;
    private applyCustomizationDiff;
    private detectComponentChanges;
    private extractDesignTokens;
    private extractCustomCSS;
    private createEmptyVisualState;
    private createEmptyInteractionCapabilities;
    private createEmptyBoundingRect;
    private createEmptyAccessibilityInfo;
    private parseRuleProperties;
    private calculateSpecificity;
    private determineStyleSource;
    private getMediaQuery;
    private capturePseudoStates;
    private detectMainLayoutType;
    private isLayoutContainer;
    private detectContainerType;
    private captureLayoutProperties;
    private capturePositioningContext;
    private detectResponsiveBreakpoints;
    private captureStackingContext;
    private createActiveContext;
    private createCustomizationMetadata;
    private mapPatchToCustomizationType;
    private extractChangesFromPatch;
    /**
     * Captures layout context that helps understand element relationships
     * and layout dependencies for safer patch operations
     */
    private captureLayoutContext;
    private isElementLayoutContainer;
    private detectLayoutRole;
}
export declare function createWebsiteSerializer(config?: Pick<InterceptConfig, "uidAttribute" | "descriptionAttribute">): WebsiteSerializer;
