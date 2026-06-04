export type NodeType = "element" | "text";
export interface BaseNode {
    uid: string;
    nodeType: NodeType;
    domRef: Element | Text;
}
export interface TextNode extends BaseNode {
    nodeType: "text";
    textContent: string;
}
export interface ElementNode extends BaseNode {
    nodeType: "element";
    tag: string;
    attributes: Record<string, string>;
    styles: Record<string, string>;
    children: InterceptNode[];
    originalIndex: number;
    initiallyHidden: boolean;
}
export type InterceptNode = ElementNode | TextNode;
export type PatchOp = "restyle" | "reorder" | "move" | "hide" | "show" | "setText" | "addClass" | "removeClass";
export type PatchSource = "ai" | "manual" | "user";
export interface BasePatch {
    id: string;
    op: PatchOp;
    target: string;
    timestamp: number;
    source: PatchSource;
}
export interface RestylePatch extends BasePatch {
    op: "restyle";
    payload: {
        styles: Record<string, string>;
    };
}
export interface ReorderPatch extends BasePatch {
    op: "reorder";
    payload: {
        order: string[];
    };
}
export interface MovePatch extends BasePatch {
    op: "move";
    payload: {
        newParent: string;
        index: number;
    };
}
export interface HidePatch extends BasePatch {
    op: "hide";
    payload: Record<string, never>;
}
export interface ShowPatch extends BasePatch {
    op: "show";
    payload: Record<string, never>;
}
export interface SetTextPatch extends BasePatch {
    op: "setText";
    payload: {
        text: string;
    };
}
export interface AddClassPatch extends BasePatch {
    op: "addClass";
    payload: {
        classes: string[];
    };
}
export interface RemoveClassPatch extends BasePatch {
    op: "removeClass";
    payload: {
        classes: string[];
    };
}
export type Patch = RestylePatch | ReorderPatch | MovePatch | HidePatch | ShowPatch | SetTextPatch | AddClassPatch | RemoveClassPatch;
export interface PatchStore {
    add(patch: Patch): void;
    remove(id: string): boolean;
    getAll(): Patch[];
    clear(): void;
    serialize(): string;
    hydrate(json: string): void;
}
export interface PatchResult {
    success: boolean;
    warnings: string[];
}
export interface SelectedElement {
    uid: string;
    tag: string;
    description: string;
    computedStyles: Record<string, string>;
    rect: DOMRect;
    classes: string[];
}
export type AIProvider = "anthropic" | "openai" | "gemini";
export interface AIProviderConfig {
    provider: AIProvider;
    apiKey: string;
    model?: string;
    maxTokens?: number;
    systemPromptExtra?: string;
}
export interface AIPromptResult {
    patches: Patch[];
    raw: string;
    warnings: string[];
}
export type AIStatus = {
    state: "idle";
} | {
    state: "loading";
} | {
    state: "error";
    message: string;
} | {
    state: "clarification_needed";
    question: string;
};
export interface InterceptConfig {
    root?: Element;
    uidAttribute?: string;
    descriptionAttribute?: string;
    skipTags?: string[];
    persistKey?: string;
    debug?: boolean;
    ai?: AIProviderConfig;
    onSelect?: (el: SelectedElement | null) => void;
    /** Website hash key — sent as X-Website-Key on every API request. Read automatically from data-website-key on the <script> tag. */
    websiteKey?: string;
    /** Automatic website snapshotting configuration */
    snapshot?: {
        /** Enable automatic snapshot creation */
        enabled?: boolean;
        /** Backend API configuration */
        api?: {
            baseUrl: string;
            apiKey?: string;
            timeout?: number;
        };
        /** Custom website ID (defaults to hostname + pathname) */
        websiteId?: string;
        /** Custom user ID (defaults to auto-detected or anonymous) */
        userId?: string;
        /** Create snapshots on significant changes (default: true) */
        onChanges?: boolean;
        /** Minimum interval between snapshots in milliseconds (default: 5000) */
        throttleMs?: number;
    };
}
