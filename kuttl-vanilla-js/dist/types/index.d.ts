import type { InterceptConfig, InterceptNode, Patch, PatchStore, AIPromptResult, AIStatus, SelectedElement } from "./types/index";
import { type PreviewResult } from "./core/preview";
export interface InterceptInstance {
    patch(patches: Patch | Patch[]): Promise<{
        warnings: string[];
    }>;
    unpatch(patchId: string): Promise<boolean>;
    undo(): Promise<boolean>;
    reset(): void;
    export(): string;
    import(json: string): Promise<void>;
    preview(patches: Patch | Patch[]): PreviewResult;
    generateSemanticPatches(operation: string, targetUid: string): Patch[];
    /** Send a natural language prompt. Requires ai config at init. */
    prompt(userPrompt: string): Promise<{
        result: AIPromptResult;
        status: AIStatus;
    }>;
    /**
     * Toggle click-to-select mode. While active, hovering highlights
     * elements and clicking pins the selection, which is automatically
     * included as context in the next prompt() call.
     */
    toggleSelect(): boolean;
    /** Manually clear the current selection. */
    clearSelection(): void;
    /** Returns the currently selected element, or null. */
    readonly selection: SelectedElement | null;
    readonly store: PatchStore;
    readonly sourceSnapshot: Readonly<InterceptNode>;
    /** Create a complete website snapshot with full context */
    createSnapshot(websiteId: string, userId: string, sessionId?: string, promptContext?: import('./types/serialization').PromptContext): import('./types/serialization').WebsiteSnapshot;
    /** Create a diff between current state and last snapshot */
    createDiff(): import('./types/serialization').SnapshotDiff | null;
    /** Apply a diff to update the state incrementally */
    applyDiff(diff: import('./types/serialization').SnapshotDiff): void;
    /** Get the last created snapshot */
    readonly lastSnapshot: import('./types/serialization').WebsiteSnapshot | null;
}
export declare function init(userConfig?: InterceptConfig): InterceptInstance;
export type { InterceptConfig, AIProviderConfig, AIPromptResult, AIStatus, Patch, InterceptNode, ElementNode, TextNode, SelectedElement, } from "./types/index";
export type { WebsiteSnapshot, ComponentState, SnapshotDiff, StyleSnapshot, LayoutStructure, CustomizationLayer, } from "./types/serialization";
