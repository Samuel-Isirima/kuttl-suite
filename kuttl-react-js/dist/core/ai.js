import { generatePatchId } from "../core/store";
// ─────────────────────────────────────────────
// Provider defaults
// ─────────────────────────────────────────────
const DEFAULTS = {
    anthropic: { model: "claude-opus-4-5", endpoint: "https://api.anthropic.com/v1/messages" },
    openai: { model: "gpt-4o", endpoint: "https://api.openai.com/v1/chat/completions" },
    gemini: { model: "gemini-2.0-flash", endpointBase: "https://generativelanguage.googleapis.com/v1beta/models" },
};
// ─────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────
function buildSystemPrompt(extra) {
    const base = `
You are a DOM manipulation assistant for Cuttlefish, an AI-powered UI patching library for React apps.
Translate natural language instructions into patch operations.

Respond ONLY with a valid JSON object — no prose, no markdown, no code fences.

Shape 1 — patches:
{ "type": "patches", "patches": [ ...patch objects ] }

Shape 2 — clarification:
{ "type": "clarification", "question": "..." }

Patch schemas:

Restyle (CSS styles as kebab-case):
{ "op": "restyle", "target": "<uid>", "payload": { "styles": { "color": "red", "font-size": "18px" } } }

Reorder (children of a parent element — opt-in):
{ "op": "reorder", "target": "<parent-uid>", "payload": { "order": ["<uid1>", "<uid2>"] } }

Move:
{ "op": "move", "target": "<uid>", "payload": { "newParent": "<uid>", "index": 0 } }

Hide:
{ "op": "hide", "target": "<uid>", "payload": {} }

Show:
{ "op": "show", "target": "<uid>", "payload": {} }

SetText (replaces text content of simple text elements):
{ "op": "setText", "target": "<uid>", "payload": { "text": "..." } }

AddClass (for Tailwind/Bootstrap class toggling):
{ "op": "addClass", "target": "<uid>", "payload": { "classes": ["bg-blue-500"] } }

RemoveClass:
{ "op": "removeClass", "target": "<uid>", "payload": { "classes": ["hidden"] } }

Rules:
- Only use uids present in the provided component tree context.
- CSS property names must be kebab-case (e.g. "font-size", not "fontSize").
- Prefer addClass/removeClass for Tailwind and Bootstrap components.
- reorder and move only work on elements whose components use the useCuttlefish() hook.
- Do not include "id", "timestamp", or "source" in patch objects.
- If the request is impossible, return a clarification response.
`.trim();
    return extra ? `${base}\n\n${extra}` : base;
}
// ─────────────────────────────────────────────
// Context serialisation
// ─────────────────────────────────────────────
/**
 * Serialises the React DOM tree into a compact context for the LLM.
 * We walk the real DOM looking for data-uid attributes, which are the
 * stable handles Cuttlefish uses for targeting.
 */
export function serializeReactTree(root, uidAttr, overrideIndex, depth = 0, maxDepth = 12) {
    if (depth > maxDepth)
        return { truncated: true };
    const uid = root.getAttribute(uidAttr);
    const tag = root.tagName.toLowerCase();
    const desc = root.getAttribute("data-description") ?? root.getAttribute("aria-label");
    const id = root.id || undefined;
    const cls = root.className || undefined;
    const inViewport = isInViewport(root);
    const result = { tag };
    if (uid)
        result["uid"] = uid;
    if (desc)
        result["description"] = desc;
    if (id)
        result["id"] = id;
    if (cls)
        result["class"] = cls;
    if (inViewport)
        result["inViewport"] = true;
    // Include current overrides so model knows what's already applied
    if (uid && overrideIndex.has(uid)) {
        result["currentOverrides"] = overrideIndex.get(uid);
    }
    // Short inner text for label inference
    const directText = Array.from(root.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent?.trim())
        .filter(Boolean)
        .join(" ")
        .slice(0, 60);
    if (directText)
        result["text"] = directText;
    const children = Array.from(root.children)
        .filter((el) => !["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName))
        .map((el) => serializeReactTree(el, uidAttr, overrideIndex, depth + 1, maxDepth));
    if (children.length)
        result["children"] = children;
    return result;
}
function isInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
}
// ─────────────────────────────────────────────
// Provider calls
// ─────────────────────────────────────────────
async function callAnthropic(system, user, cfg) {
    const d = DEFAULTS.anthropic;
    const r = await fetch(d.endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": cfg.apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
            model: cfg.model ?? d.model,
            max_tokens: cfg.maxTokens ?? 8192,
            system,
            messages: [{ role: "user", content: user }],
        }),
    });
    if (!r.ok)
        throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
    const data = await r.json();
    const block = data.content.find((b) => b.type === "text");
    if (!block)
        throw new Error("Anthropic: no text block");
    return block.text;
}
async function callOpenAI(system, user, cfg) {
    const d = DEFAULTS.openai;
    const r = await fetch(d.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
            model: cfg.model ?? d.model,
            max_tokens: cfg.maxTokens ?? 1024,
            messages: [{ role: "system", content: system }, { role: "user", content: user }],
        }),
    });
    if (!r.ok)
        throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
    const data = await r.json();
    return data.choices[0]?.message?.content ?? "";
}
async function callGemini(system, user, cfg) {
    const d = DEFAULTS.gemini;
    const model = cfg.model ?? d.model;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey },
        body: JSON.stringify({
            contents: [
                { role: "user", parts: [{ text: system }] },
                { role: "model", parts: [{ text: "Understood. JSON only." }] },
                { role: "user", parts: [{ text: user }] },
            ],
            generationConfig: { maxOutputTokens: cfg.maxTokens ?? 1024, temperature: 0.1 },
        }),
    });
    console.log('AI RESPONSE');
    console.log(r.body);
    if (!r.ok)
        throw new Error(`Gemini ${r.status}: ${await r.text()}`);
    const data = await r.json();
    const c = data.candidates[0];
    if (!c)
        throw new Error("Gemini: no candidates");
    if (c.finishReason === "SAFETY")
        throw new Error("Gemini: blocked by safety filter");
    return c.content.parts.map((p) => p.text).join("");
}
function parseResponse(raw) {
    console.log('parse response');
    console.log(raw);
    const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed))
        return { type: "patches", patches: parsed };
    if (typeof parsed !== "object" || !parsed)
        throw new Error("Not an object");
    const obj = parsed;
    if (obj["type"] === "clarification")
        return { type: "clarification", question: String(obj["question"]) };
    if (obj["type"] === "patches" && Array.isArray(obj["patches"]))
        return { type: "patches", patches: obj["patches"] };
    if (typeof obj["op"] === "string")
        return { type: "patches", patches: [obj] };
    throw new Error(`Unknown response type: ${String(obj["type"])}`);
}
function stampPatch(raw) {
    if (typeof raw !== "object" || !raw)
        throw new Error("Not an object");
    const obj = raw;
    const validOps = ["restyle", "reorder", "move", "hide", "show", "setText", "addClass", "removeClass"];
    if (!validOps.includes(String(obj["op"])))
        throw new Error(`Invalid op: ${String(obj["op"])}`);
    if (!obj["target"])
        throw new Error("Missing target");
    return { ...obj, id: generatePatchId(), timestamp: Date.now(), source: "ai" };
}
// ─────────────────────────────────────────────
// Public
// ─────────────────────────────────────────────
export async function sendAIPrompt(userPrompt, cfg, root, uidAttr, overrideIndex, selectedUid, extra) {
    const systemPrompt = buildSystemPrompt(extra);
    const tree = JSON.stringify(serializeReactTree(root, uidAttr, overrideIndex), null, 2);
    let selectedCtx = "";
    if (selectedUid) {
        const el = root.querySelector(`[${uidAttr}="${selectedUid}"]`);
        if (el) {
            const computed = window.getComputedStyle(el);
            const styles = {};
            for (const p of ["color", "background-color", "font-size", "font-weight", "display", "padding", "margin"]) {
                styles[p] = computed.getPropertyValue(p);
            }
            selectedCtx = `\nSelected element (user clicked this): ${JSON.stringify({ uid: selectedUid, tag: el.tagName.toLowerCase(), class: el.className, computedStyles: styles })}\n`;
        }
    }
    const userMessage = `Current React component tree (inViewport=true means currently visible):\n${tree}\n${selectedCtx}\nUser instruction: ${userPrompt}`;
    let raw = "";
    try {
        switch (cfg.provider) {
            case "anthropic":
                raw = await callAnthropic(systemPrompt, userMessage, cfg);
                break;
            case "openai":
                raw = await callOpenAI(systemPrompt, userMessage, cfg);
                break;
            case "gemini":
                raw = await callGemini(systemPrompt, userMessage, cfg);
                break;
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { result: { patches: [], raw: "", warnings: [message] }, status: { state: "error", message } };
    }
    let parsed;
    try {
        parsed = parseResponse(raw);
    }
    catch (err) {
        const message = `Parse error: ${err instanceof Error ? err.message : String(err)}`;
        return { result: { patches: [], raw, warnings: [message] }, status: { state: "error", message } };
    }
    if (parsed.type === "clarification") {
        return { result: { patches: [], raw, warnings: [] }, status: { state: "clarification_needed", question: parsed.question } };
    }
    const patches = [];
    const warnings = [];
    for (const p of parsed.patches) {
        try {
            patches.push(stampPatch(p));
        }
        catch (e) {
            warnings.push(`Skipped: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    return { result: { patches, raw, warnings }, status: { state: "idle" } };
}
//# sourceMappingURL=ai.js.map