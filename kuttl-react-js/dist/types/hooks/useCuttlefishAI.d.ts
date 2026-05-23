import type { AIStatus, AIPromptResult } from "../types/index.js";
export interface UseCuttlefishAIReturn {
    sendPrompt(text: string): Promise<void>;
    status: AIStatus;
    lastResult: AIPromptResult | null;
    isLoading: boolean;
}
/**
 * useCuttlefishAI
 *
 * Convenience hook for sending AI prompts and tracking their status.
 * Manages loading state and last result for you.
 *
 * @example
 * function AIBar() {
 *   const { sendPrompt, status, isLoading } = useCuttlefishAI()
 *   const [input, setInput] = React.useState("")
 *
 *   return (
 *     <div>
 *       <input value={input} onChange={e => setInput(e.target.value)} />
 *       <button onClick={() => sendPrompt(input)} disabled={isLoading}>
 *         {isLoading ? "Thinking…" : "Send"}
 *       </button>
 *       {status.state === "clarification_needed" && <p>{status.question}</p>}
 *       {status.state === "error" && <p style={{ color: "red" }}>{status.message}</p>}
 *     </div>
 *   )
 * }
 */
export declare function useCuttlefishAI(): UseCuttlefishAIReturn;
