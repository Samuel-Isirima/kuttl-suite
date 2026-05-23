import * as React from "react";
import type { AIStatus, AIPromptResult } from "../types/index.js";
import { useCuttlefishContext } from "../components/Provider.js";

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
export function useCuttlefishAI(): UseCuttlefishAIReturn {
  const { prompt } = useCuttlefishContext();

  const [status,     setStatus]     = React.useState<AIStatus>({ state: "idle" });
  const [lastResult, setLastResult] = React.useState<AIPromptResult | null>(null);

  const sendPrompt = React.useCallback(async (text: string) => {
    setStatus({ state: "loading" });
    try {
      const { result, status: s } = await prompt(text);
      setLastResult(result);
      setStatus(s);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ state: "error", message });
    }
  }, [prompt]);

  return {
    sendPrompt,
    status,
    lastResult,
    isLoading: status.state === "loading",
  };
}
