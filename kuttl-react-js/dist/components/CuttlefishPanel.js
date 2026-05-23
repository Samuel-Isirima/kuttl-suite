import * as React from "react";
import { useCuttlefishContext } from "./Provider.js";
import { useCuttlefishAI } from "../hooks/useCuttlefishAI.js";
// ─────────────────────────────────────────────
// Styles injected once
// ─────────────────────────────────────────────
const CSS = `
  #ctf-fab {
    position: fixed; bottom: 28px; right: 28px; z-index: 2147483640;
    width: 46px; height: 46px; border-radius: 50%;
    background: #fff; border: 1px solid #e0e0e0; color: #999;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    opacity: 0.3; transition: opacity 0.22s, box-shadow 0.22s, transform 0.18s;
    box-shadow: 0 2px 10px rgba(0,0,0,0.12); outline: none;
  }
  #ctf-fab:hover, #ctf-fab.ctf-open {
    opacity: 1; color: #444;
    box-shadow: 0 4px 20px rgba(0,0,0,0.18); transform: scale(1.06);
  }
  #ctf-panel {
    position: fixed; bottom: 84px; right: 28px; z-index: 2147483639;
    width: 300px; background: #fff; border: 1px solid #e8e8e8;
    border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px; color: #333; display: flex; flex-direction: column;
    overflow: hidden; transform-origin: bottom right;
    transition: width 0.26s cubic-bezier(0.4,0,0.2,1);
    animation: ctf-pop 0.2s cubic-bezier(0.34,1.4,0.64,1);
  }
  #ctf-panel.ctf-expanded { width: 500px; }
  @keyframes ctf-pop {
    from { opacity:0; transform: scale(0.9) translateY(8px); }
    to   { opacity:1; transform: scale(1)   translateY(0); }
  }
  .ctf-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 11px 12px 9px; border-bottom: 1px solid #f0f0f0;
  }
  .ctf-title {
    font-size: 11px; font-weight: 600; letter-spacing: 0.07em;
    text-transform: uppercase; color: #bbb; display: flex; align-items: center; gap: 7px;
  }
  .ctf-dot {
    width: 5px; height: 5px; border-radius: 50%; background: #22c55e;
    animation: ctf-pulse 2.4s infinite;
  }
  @keyframes ctf-pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
  .ctf-header-actions { display: flex; gap: 2px; }
  .ctf-icon-btn {
    background: none; border: none; color: #d4d4d4; cursor: pointer;
    width: 26px; height: 26px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.12s, color 0.12s;
  }
  .ctf-icon-btn:hover { background: #f5f5f5; color: #666; }
  .ctf-config-row {
    display: flex; gap: 6px; padding: 9px 12px;
    border-bottom: 1px solid #f5f5f5;
  }
  .ctf-select, .ctf-input {
    background: #fafafa; border: 1px solid #ebebeb; border-radius: 6px;
    color: #555; font-family: inherit; font-size: 12px; padding: 6px 8px;
    outline: none; transition: border-color 0.14s;
  }
  .ctf-select:focus, .ctf-input:focus { border-color: #ccc; }
  .ctf-select { width: 100px; flex-shrink: 0; }
  .ctf-input  { flex: 1; min-width: 0; }
  .ctf-prompt-wrap {
    padding: 10px 12px 9px; border-bottom: 1px solid #f5f5f5;
  }
  .ctf-textarea {
    width: 100%; background: #fafafa; border: 1px solid #ebebeb;
    border-radius: 7px; color: #333; font-family: inherit; font-size: 12.5px;
    padding: 9px 11px; resize: none; outline: none; min-height: 58px;
    line-height: 1.5; box-sizing: border-box; transition: border-color 0.14s, background 0.14s;
  }
  .ctf-textarea:focus { border-color: #ccc; background: #fff; }
  .ctf-textarea::placeholder { color: #d4d4d4; }
  .ctf-status { margin-top: 6px; font-size: 11.5px; color: #ccc; min-height: 16px; }
  .ctf-status-err     { color: #ef4444; }
  .ctf-status-loading { color: #818cf8; }
  .ctf-status-clarify { color: #f59e0b; }
  .ctf-status-ok      { color: #22c55e; }
  .ctf-send-btn {
    margin-top: 8px; width: 100%; background: #111; border: none;
    border-radius: 7px; color: #fff; font-family: inherit; font-size: 12px;
    font-weight: 500; padding: 8px 12px; cursor: pointer;
    transition: background 0.14s, opacity 0.14s;
  }
  .ctf-send-btn:hover { background: #222; }
  .ctf-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .ctf-actions {
    display: flex; gap: 5px; padding: 8px 12px; border-bottom: 1px solid #f5f5f5;
  }
  .ctf-action {
    flex: 1; background: #fafafa; border: 1px solid #ebebeb; border-radius: 6px;
    color: #999; font-family: inherit; font-size: 11px; font-weight: 500;
    padding: 6px 4px; cursor: pointer; text-align: center;
    transition: background 0.12s, color 0.12s, border-color 0.12s; white-space: nowrap;
  }
  .ctf-action:hover        { background: #f0f0f0; color: #333; border-color: #ddd; }
  .ctf-action-active       { background: #f0fdf4 !important; color: #16a34a !important; border-color: #bbf7d0 !important; }
  .ctf-action-saved        { background: #f0fdf4 !important; color: #16a34a !important; border-color: #bbf7d0 !important; }
  .ctf-action-danger:hover { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
  .ctf-sel-bar {
    padding: 6px 12px; font-size: 11.5px; color: #ccc;
    border-bottom: 1px solid #f5f5f5;
    display: flex; align-items: center; gap: 6px; min-height: 30px;
  }
  .ctf-sel-bar-active { color: #16a34a; }
  .ctf-clear-sel {
    margin-left: auto; background: none; border: none; color: #ddd;
    cursor: pointer; font-size: 11px; padding: 1px 3px; border-radius: 3px;
    transition: color 0.12s;
  }
  .ctf-clear-sel:hover { color: #999; }
  .ctf-expanded-body {
    display: flex; flex-direction: column; overflow: hidden; flex: 1; min-height: 0;
  }
  .ctf-tabs { display: flex; border-bottom: 1px solid #f0f0f0; }
  .ctf-tab {
    flex: 1; background: none; border: none; border-bottom: 2px solid transparent;
    color: #ccc; font-family: inherit; font-size: 11.5px; font-weight: 500;
    padding: 8px 10px; cursor: pointer; text-align: center; margin-bottom: -1px;
    transition: color 0.12s, border-color 0.12s;
  }
  .ctf-tab:hover { color: #777; }
  .ctf-tab-active { color: #333 !important; border-bottom-color: #333 !important; }
  .ctf-tab-panel {
    overflow-y: auto; min-height: 160px; max-height: 280px;
  }
  .ctf-tab-panel::-webkit-scrollbar { width: 3px; }
  .ctf-tab-panel::-webkit-scrollbar-thumb { background: #ebebeb; border-radius: 2px; }
  .ctf-patch-item {
    display: flex; align-items: center; gap: 7px; padding: 7px 12px;
    border-bottom: 1px solid #fafafa; font-size: 11.5px;
  }
  .ctf-patch-item:last-child { border-bottom: none; }
  .ctf-patch-op {
    font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
    color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0;
    border-radius: 4px; padding: 2px 5px; flex-shrink: 0;
  }
  .ctf-patch-target { color: #999; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ctf-patch-src { font-size: 10px; color: #ddd; flex-shrink: 0; }
  .ctf-patch-rm {
    background: none; border: none; color: #ddd; font-size: 11px; cursor: pointer;
    padding: 2px 4px; border-radius: 3px; transition: color 0.12s, background 0.12s; flex-shrink: 0;
  }
  .ctf-patch-rm:hover { color: #ef4444; background: #fef2f2; }
  .ctf-prompt-item { padding: 8px 12px; border-bottom: 1px solid #fafafa; font-size: 12px; }
  .ctf-prompt-item:last-child { border-bottom: none; }
  .ctf-prompt-text { color: #444; line-height: 1.45; margin-bottom: 4px; }
  .ctf-prompt-meta { font-size: 10.5px; color: #ccc; display: flex; gap: 8px; }
  .ctf-prompt-meta-ok  { color: #22c55e; }
  .ctf-prompt-meta-err { color: #ef4444; }
  .ctf-empty { padding: 28px 16px; font-size: 12px; color: #ddd; text-align: center; }
`;
// ─────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────
const FAB_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8 2 5 5 5 9c0 2 .8 3.8 2 5l-2 4h14l-2-4c1.2-1.2 2-3 2-5 0-4-3-7-7-7z"/><path d="M9 9h.01M15 9h.01"/><path d="M5 14c-1.5.5-3 .3-3-1s1.5-2 3-1.5"/><path d="M19 14c1.5.5 3 .3 3-1s-1.5-2-3-1.5"/></svg>`;
const EXPAND_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
const COLLAPSE_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 14h6v6M14 4h6v6M4 20l7-7M20 4l-7 7"/></svg>`;
const CLOSE_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
export function CuttlefishPanel({ defaultProvider = "anthropic", defaultApiKey = "", }) {
    const ctx = useCuttlefishContext();
    const { sendPrompt, status, isLoading } = useCuttlefishAI();
    const [open, setOpen] = React.useState(false);
    const [expanded, setExpanded] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState("patches");
    const [provider, setProvider] = React.useState(defaultProvider);
    const [apiKey, setApiKey] = React.useState(defaultApiKey);
    const [promptText, setPromptText] = React.useState("");
    const [history, setHistory] = React.useState([]);
    const [selectOn, setSelectOn] = React.useState(false);
    const [savedFlash, setSavedFlash] = React.useState(false);
    const panelRef = React.useRef(null);
    // Inject styles once
    React.useEffect(() => {
        if (!document.getElementById("__ctf_react_styles__")) {
            const s = document.createElement("style");
            s.id = "__ctf_react_styles__";
            s.textContent = CSS;
            document.head.appendChild(s);
        }
    }, []);
    // Close on outside click (but not while selecting)
    React.useEffect(() => {
        if (!open)
            return;
        function onOutside(e) {
            if (selectOn)
                return;
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                const fab = document.getElementById("ctf-react-fab");
                if (fab && fab.contains(e.target))
                    return;
                setOpen(false);
            }
        }
        document.addEventListener("click", onOutside, true);
        return () => document.removeEventListener("click", onOutside, true);
    }, [open, selectOn]);
    // Status text
    const statusText = React.useMemo(() => {
        if (status.state === "loading")
            return { text: "Thinking…", cls: "ctf-status-loading" };
        if (status.state === "error")
            return { text: status.message, cls: "ctf-status-err" };
        if (status.state === "clarification_needed")
            return { text: status.question, cls: "ctf-status-clarify" };
        return { text: "Ready", cls: "" };
    }, [status]);
    // Send
    async function handleSend() {
        if (!promptText.trim() || isLoading)
            return;
        const text = promptText.trim();
        setPromptText("");
        const before = ctx.patches.length;
        await sendPrompt(text);
        const after = ctx.patches.length;
        setHistory((h) => [{ text, timestamp: Date.now(), patchCount: after - before, error: status.state === "error" ? status.message : null }, ...h]);
    }
    function handleKeyDown(e) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSend();
        }
    }
    // Select toggle
    function handleToggleSelect() {
        ctx.toggleSelect();
        setSelectOn((v) => !v);
    }
    // Save
    function handleSave() {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1800);
    }
    if (!open) {
        return React.createElement("button", {
            id: "ctf-react-fab",
            className: "ctf-open" in {} ? "ctf-open" : "",
            style: {
                position: "fixed", bottom: 28, right: 28, zIndex: 2147483640,
                width: 46, height: 46, borderRadius: "50%",
                background: "#fff", border: "1px solid #e0e0e0", color: "#999",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0.3, transition: "opacity 0.22s, box-shadow 0.22s, transform 0.18s",
                boxShadow: "0 2px 10px rgba(0,0,0,0.12)", outline: "none",
            },
            title: "Cuttlefish",
            onClick: () => setOpen(true),
            dangerouslySetInnerHTML: { __html: FAB_SVG },
            onMouseEnter: (e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "scale(1.06)";
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.opacity = "0.3";
                e.currentTarget.style.transform = "scale(1)";
            },
        });
    }
    // Selection display
    const selDisplay = ctx.selectedUid
        ? `Selected: #${ctx.selectedUid}`
        : "No element selected";
    return React.createElement(React.Fragment, null, 
    // FAB (open state)
    React.createElement("button", {
        id: "ctf-react-fab",
        style: {
            position: "fixed", bottom: 28, right: 28, zIndex: 2147483640,
            width: 46, height: 46, borderRadius: "50%",
            background: "#fff", border: "1px solid #e0e0e0", color: "#444",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 1, boxShadow: "0 4px 20px rgba(0,0,0,0.18)", transform: "scale(1.06)",
            outline: "none", transition: "opacity 0.22s, box-shadow 0.22s, transform 0.18s",
        },
        onClick: () => setOpen(false),
        dangerouslySetInnerHTML: { __html: FAB_SVG },
    }), 
    // Panel
    React.createElement("div", {
        id: "ctf-panel",
        ref: panelRef,
        className: expanded ? "ctf-expanded" : "",
    }, 
    // Header
    React.createElement("div", { className: "ctf-header" }, React.createElement("span", { className: "ctf-title" }, React.createElement("span", { className: "ctf-dot" }), "Cuttlefish"), React.createElement("div", { className: "ctf-header-actions" }, React.createElement("button", {
        className: "ctf-icon-btn",
        title: expanded ? "Collapse" : "Expand",
        onClick: () => setExpanded((v) => !v),
        dangerouslySetInnerHTML: { __html: expanded ? COLLAPSE_SVG : EXPAND_SVG },
    }), React.createElement("button", {
        className: "ctf-icon-btn",
        title: "Close",
        onClick: () => setOpen(false),
        dangerouslySetInnerHTML: { __html: CLOSE_SVG },
    }))), 
    // Config
    React.createElement("div", { className: "ctf-config-row" }, React.createElement("select", {
        className: "ctf-select",
        value: provider,
        onChange: (e) => setProvider(e.target.value),
    }, React.createElement("option", { value: "anthropic" }, "Anthropic"), React.createElement("option", { value: "openai" }, "OpenAI"), React.createElement("option", { value: "gemini" }, "Gemini")), React.createElement("input", {
        className: "ctf-input",
        type: "password",
        placeholder: "API key…",
        value: apiKey,
        onChange: (e) => setApiKey(e.target.value),
    })), 
    // Prompt
    React.createElement("div", { className: "ctf-prompt-wrap" }, React.createElement("textarea", {
        className: "ctf-textarea",
        placeholder: "Describe a change…\ne.g. 'make the title blue'\nCtrl+Enter to send",
        value: promptText,
        onChange: (e) => setPromptText(e.target.value),
        onKeyDown: handleKeyDown,
    }), React.createElement("div", { className: `ctf-status ${statusText.cls}` }, statusText.text), React.createElement("button", {
        className: "ctf-send-btn",
        onClick: handleSend,
        disabled: isLoading || !apiKey,
    }, isLoading ? "Thinking…" : "Send prompt")), 
    // Actions
    React.createElement("div", { className: "ctf-actions" }, React.createElement("button", {
        className: `ctf-action${selectOn ? " ctf-action-active" : ""}`,
        onClick: handleToggleSelect,
    }, selectOn ? "● Selecting…" : "⊕ Select"), React.createElement("button", {
        className: "ctf-action",
        onClick: ctx.undo,
    }, "↩ Undo"), React.createElement("button", {
        className: `ctf-action${savedFlash ? " ctf-action-saved" : ""}`,
        onClick: handleSave,
    }, savedFlash ? "✓ Saved" : "↓ Save"), React.createElement("button", {
        className: "ctf-action ctf-action-danger",
        onClick: () => { ctx.reset(); setSelectOn(false); },
    }, "✕ Reset")), 
    // Selection bar
    React.createElement("div", {
        className: `ctf-sel-bar${ctx.selectedUid ? " ctf-sel-bar-active" : ""}`,
    }, React.createElement("span", null, selDisplay), React.createElement("button", {
        className: "ctf-clear-sel",
        onClick: () => { ctx.clearSelection(); setSelectOn(false); },
    }, "✕")), 
    // Expanded body
    expanded && React.createElement("div", { className: "ctf-expanded-body" }, 
    // Tabs
    React.createElement("div", { className: "ctf-tabs" }, React.createElement("button", {
        className: `ctf-tab${activeTab === "patches" ? " ctf-tab-active" : ""}`,
        onClick: () => setActiveTab("patches"),
    }, "Patch history"), React.createElement("button", {
        className: `ctf-tab${activeTab === "prompts" ? " ctf-tab-active" : ""}`,
        onClick: () => setActiveTab("prompts"),
    }, "Prompt history")), 
    // Patch list
    activeTab === "patches" && React.createElement("div", { className: "ctf-tab-panel" }, ctx.patches.length === 0
        ? React.createElement("div", { className: "ctf-empty" }, "No patches applied yet")
        : ctx.patches.map((p) => React.createElement("div", { key: p.id, className: "ctf-patch-item" }, React.createElement("span", { className: "ctf-patch-op" }, p.op), React.createElement("span", { className: "ctf-patch-target" }, p.target), React.createElement("span", { className: "ctf-patch-src" }, p.source), React.createElement("button", {
            className: "ctf-patch-rm",
            onClick: () => ctx.patch({ ...p, op: p.op }),
        }, "✕")))), 
    // Prompt history
    activeTab === "prompts" && React.createElement("div", { className: "ctf-tab-panel" }, history.length === 0
        ? React.createElement("div", { className: "ctf-empty" }, "No prompts sent yet")
        : history.map((e, i) => React.createElement("div", { key: i, className: "ctf-prompt-item" }, React.createElement("div", { className: "ctf-prompt-text" }, e.text), React.createElement("div", { className: "ctf-prompt-meta" }, React.createElement("span", null, new Date(e.timestamp).toLocaleTimeString()), e.error
            ? React.createElement("span", { className: "ctf-prompt-meta-err" }, `✕ ${e.error.slice(0, 50)}`)
            : React.createElement("span", { className: "ctf-prompt-meta-ok" }, `✓ ${e.patchCount} patch(es)`))))))));
}
//# sourceMappingURL=CuttlefishPanel.js.map