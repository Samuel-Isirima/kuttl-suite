import type { AIProviderConfig, AIPromptResult, AIStatus, OverrideIndex } from "../types/index";
/**
 * Serialises the React DOM tree into a compact context for the LLM.
 * We walk the real DOM looking for data-uid attributes, which are the
 * stable handles Cuttlefish uses for targeting.
 */
export declare function serializeReactTree(root: Element, uidAttr: string, overrideIndex: OverrideIndex, depth?: number, maxDepth?: number): object;
export declare function sendAIPrompt(userPrompt: string, cfg: AIProviderConfig, root: Element, uidAttr: string, overrideIndex: OverrideIndex, selectedUid: string | null, extra?: string): Promise<{
    result: AIPromptResult;
    status: AIStatus;
}>;
