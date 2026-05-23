/**
 * core/ai.ts
 *
 * Forwards all AI prompts to the backend proxy.
 * The backend owns all LLM credentials and config.
 */
import type { AIPromptResult, AIStatus, InterceptNode, SelectedElement } from "../types/index";
export interface AILayerHandle {
    prompt(userPrompt: string, workingTree: InterceptNode, descAttr: string, selection: SelectedElement | null, websiteId: string): Promise<{
        result: AIPromptResult;
        status: AIStatus;
    }>;
}
export declare function createAILayer(): AILayerHandle;
