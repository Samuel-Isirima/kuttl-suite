/**
 * core/ai.ts
 *
 * Forwards all AI prompts to the backend proxy.
 * The backend owns all LLM credentials and config.
 */

import type {
  AIPromptResult,
  AIStatus,
  InterceptNode,
  SelectedElement,
  Patch,
} from "../types/index";
import { getFingerprint } from "./fingerprint";

const DEFAULT_API_BASE = "http://localhost:8080";

interface ProxyRequest {
  prompt:    string;
  tree:      InterceptNode;
  descAttr:  string;
  selection: SelectedElement | null;
  websiteId: string;
}

interface ProxyResponse {
  patches:  Patch[];
  warnings: string[];
  raw:      string;
  status:   "ok" | "no_changes" | "error";
}

export interface AILayerHandle {
  prompt(
    userPrompt:  string,
    workingTree: InterceptNode,
    descAttr:    string,
    selection:   SelectedElement | null,
    websiteId:   string,
  ): Promise<{ result: AIPromptResult; status: AIStatus }>;
}

function countTreeNodes(node: InterceptNode): number {
  if (node.nodeType === "text") return 1;
  return 1 + (node as any).children.reduce((sum: number, child: InterceptNode) => sum + countTreeNodes(child), 0);
}

function findNodesWithLayoutContext(node: InterceptNode): any[] {
  const result: any[] = [];
  
  if (node.nodeType === "element") {
    const element = node as any;
    if (element.layoutContext) {
      result.push({
        uid: element.uid,
        tag: element.tag,
        layoutContext: element.layoutContext
      });
    }
    
    for (const child of element.children) {
      result.push(...findNodesWithLayoutContext(child));
    }
  }
  
  return result;
}

export function createAILayer(websiteKey?: string, apiBaseUrl?: string): AILayerHandle {
  const proxyUrl = `${(apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/$/, '')}/api/prompt`;
  return {
    async prompt(userPrompt, workingTree, descAttr, selection, websiteId) {
      // Log the tree being sent to AI to check if it has layout context
      console.log("[🤖 AI Layer] Sending tree to AI with", countTreeNodes(workingTree), "nodes");
      
      // Check if any nodes have layout context
      const nodesWithLayout = findNodesWithLayoutContext(workingTree);
      console.log("[🤖 AI Layer] Nodes with layout context:", nodesWithLayout.length);
      if (nodesWithLayout.length > 0) {
        console.log("[🤖 AI Layer] Sample layout context:", nodesWithLayout[0]);
      }

      const body: ProxyRequest = {
        prompt:   userPrompt,
        tree:     workingTree,
        descAttr,
        selection,
        websiteId,
      };

      const reqHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Browser-Fingerprint": getFingerprint(),
      };
      if (websiteKey) reqHeaders["X-Website-Key"] = websiteKey;

      let response: Response;
      try {
        response = await fetch(proxyUrl, {
          method:  "POST",
          headers: reqHeaders,
          body:    JSON.stringify(body),
        });
      } catch (err) {
        return errorStatus(`Network error: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return errorStatus(`Proxy error ${response.status}: ${text || response.statusText}`);
      }

      let data: ProxyResponse;
      try {
        data = await response.json();
      } catch {
        return errorStatus("Proxy returned non-JSON response.");
      }

      return {
        result: {
          patches:  data.patches  ?? [],
          warnings: data.warnings ?? [],
          raw:      data.raw      ?? "",
        },
        status: data.status === "error"
          ? { state: "error", message: data.warnings?.[0] ?? "Unknown error" }
          : { state: "idle" },
      };
    },
  };
}

function errorStatus(message: string): { result: AIPromptResult; status: AIStatus } {
  return {
    result: { patches: [], warnings: [message], raw: "" },
    status: { state: "error", message },
  };
}