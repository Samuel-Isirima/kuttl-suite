import type {
  AIProvider,
  SelectedElement,
  Patch,
} from "../types/index";
import type { InterceptInstance } from "../index";
import { generateSemanticPatches } from "./engine";
import { previewPatches, type PreviewResult } from "./preview";

export interface CuttlefishConfig {
  provider?: AIProvider;
  apiKey?: string;
  model?: string;
}

// ─
// Styles — Original light theme, single expanding panel
// ─

const CSS = `
  #ctf-fab {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 2147483640;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: #fff;
    border: 1px solid #e0e0e0;
    color: #999;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.3;
    transition: opacity 0.22s, box-shadow 0.22s, transform 0.18s;
    box-shadow: 0 2px 10px rgba(0,0,0,0.12);
    user-select: none;
    outline: none;
  }
  #ctf-fab:hover, #ctf-fab.open {
    opacity: 1;
    color: #444;
    box-shadow: 0 4px 20px rgba(0,0,0,0.18);
    transform: scale(1.06);
  }

  #ctf-panel {
    position: fixed;
    bottom: 84px;
    right: 28px;
    z-index: 2147483639;
    width: 300px;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    color: #333;
    display: none;
    flex-direction: column;
    overflow: hidden;
    transform-origin: bottom right;
    transition: width 0.26s cubic-bezier(0.4,0,0.2,1);
  }
  #ctf-panel.visible {
    display: flex;
    animation: ctf-pop 0.2s cubic-bezier(0.34,1.4,0.64,1);
  }
  #ctf-panel.expanded { width: 500px; }

  @keyframes ctf-pop {
    from { opacity:0; transform: scale(0.9) translateY(8px); }
    to   { opacity:1; transform: scale(1)   translateY(0);   }
  }

  /* Header */
  #ctf-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 12px 9px;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
  }
  #ctf-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #bbb;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .ctf-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #22c55e;
    animation: ctf-pulse 2.4s infinite;
  }
  @keyframes ctf-pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }

  #ctf-header-actions { display:flex; gap:2px; }

  .ctf-icon-btn {
    background: none;
    border: none;
    color: #d4d4d4;
    cursor: pointer;
    width: 26px; height: 26px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s, color 0.12s;
  }
  .ctf-icon-btn:hover { background: #f5f5f5; color: #666; }

  /* Prompt */
  #ctf-prompt-wrap {
    padding: 10px 12px 9px;
    border-bottom: 1px solid #f5f5f5;
    flex-shrink: 0;
  }
  #ctf-prompt-input {
    width: 100%;
    background: #fafafa;
    border: 1px solid #ebebeb;
    border-radius: 7px;
    color: #333;
    font-family: inherit;
    font-size: 12.5px;
    padding: 9px 11px;
    resize: none;
    outline: none;
    min-height: 58px;
    line-height: 1.5;
    box-sizing: border-box;
    transition: border-color 0.14s, background 0.14s;
  }
  #ctf-prompt-input:focus { border-color: #ccc; background: #fff; }
  #ctf-prompt-input::placeholder { color: #d4d4d4; }

  #ctf-prompt-status {
    margin-top: 6px;
    font-size: 11.5px;
    color: #ccc;
    min-height: 16px;
  }
  #ctf-prompt-status.err     { color: #ef4444; }
  #ctf-prompt-status.loading { color: #818cf8; }
  #ctf-prompt-status.clarify { color: #f59e0b; }
  #ctf-prompt-status.ok      { color: #22c55e; }

  #ctf-send-btn {
    margin-top: 8px;
    width: 100%;
    background: #111;
    border: none;
    border-radius: 7px;
    color: #fff;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    padding: 8px 12px;
    cursor: pointer;
    transition: background 0.14s, opacity 0.14s;
  }
  #ctf-send-btn:hover { background: #222; }
  #ctf-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* Actions */
  #ctf-actions {
    display: flex;
    gap: 5px;
    padding: 8px 12px;
    border-bottom: 1px solid #f5f5f5;
    flex-shrink: 0;
  }
  .ctf-action {
    flex: 1;
    background: #fafafa;
    border: 1px solid #ebebeb;
    border-radius: 6px;
    color: #999;
    font-family: inherit;
    font-size: 11px;
    font-weight: 500;
    padding: 6px 4px;
    cursor: pointer;
    text-align: center;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
  }
  .ctf-action:hover       { background: #f0f0f0; color: #333; border-color: #ddd; }
  .ctf-action.active      { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
  .ctf-action.saved       { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
  .ctf-action.danger:hover{ background: #fef2f2; color: #dc2626; border-color: #fecaca; }

  /* Selection bar */
  #ctf-selection-bar {
    padding: 6px 12px;
    font-size: 11.5px;
    color: #ccc;
    border-bottom: 1px solid #f5f5f5;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    min-height: 30px;
  }
  #ctf-selection-bar.has { color: #16a34a; }
  .ctf-clear-sel {
    margin-left: auto;
    background: none;
    border: none;
    color: #ddd;
    cursor: pointer;
    font-size: 11px;
    padding: 1px 3px;
    border-radius: 3px;
    transition: color 0.12s;
  }
  .ctf-clear-sel:hover { color: #999; }

  /* Expanded body */
  #ctf-expanded-body {
    display: none;
    flex-direction: column;
    overflow: hidden;
    flex: 1;
    min-height: 0;
  }
  #ctf-panel.expanded #ctf-expanded-body { display: flex; }

  #ctf-tabs {
    display: flex;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
  }
  .ctf-tab {
    flex: 1;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: #ccc;
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 500;
    padding: 8px 10px;
    cursor: pointer;
    text-align: center;
    margin-bottom: -1px;
    transition: color 0.12s, border-color 0.12s;
  }
  .ctf-tab:hover { color: #777; }
  .ctf-tab.active { color: #333; border-bottom-color: #333; }

  .ctf-tab-panel {
    display: none;
    overflow-y: auto;
    min-height: 160px;
    max-height: 280px;
  }
  .ctf-tab-panel.active { display: block; }
  .ctf-tab-panel::-webkit-scrollbar { width: 3px; }
  .ctf-tab-panel::-webkit-scrollbar-thumb { background: #ebebeb; border-radius: 2px; }

  /* Patch items */
  .ctf-patch-item {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 12px;
    border-bottom: 1px solid #fafafa;
    font-size: 11.5px;
  }
  .ctf-patch-item:last-child { border-bottom: none; }
  .ctf-patch-op {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #16a34a;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 4px;
    padding: 2px 5px;
    flex-shrink: 0;
  }
  .ctf-patch-target {
    color: #999;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ctf-patch-src { font-size: 10px; color: #ddd; flex-shrink: 0; }
  .ctf-patch-rm {
    background: none;
    border: none;
    color: #ddd;
    font-size: 11px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    transition: color 0.12s, background 0.12s;
    flex-shrink: 0;
    line-height: 1;
  }
  .ctf-patch-rm:hover { color: #ef4444; background: #fef2f2; }

  /* Prompt items */
  .ctf-prompt-item {
    padding: 8px 12px;
    border-bottom: 1px solid #fafafa;
    font-size: 12px;
  }
  .ctf-prompt-item:last-child { border-bottom: none; }
  .ctf-prompt-text { color: #444; line-height: 1.45; margin-bottom: 4px; }
  .ctf-prompt-meta { font-size: 10.5px; color: #ccc; display: flex; gap: 8px; }
  .ctf-prompt-meta .ok  { color: #22c55e; }
  .ctf-prompt-meta .err { color: #ef4444; }

  .ctf-empty {
    padding: 28px 16px;
    font-size: 12px;
    color: #ddd;
    text-align: center;
  }

  .__ctf_pinned__ {
    outline: none !important;
    background: rgba(58,138,58,0.18);
    outline-offset: -2px !important;
    box-shadow: none !important;
    position: relative !important;
    animation: ctf-blink 1.2s ease-in-out infinite !important;
  }
  
  @keyframes ctf-blink {
    0%, 100% { background-color: rgba(58,138,58,0.0) !important; }
    50%       { background-color: rgba(58,138,58,0.4) !important; }
  }
  
`;

// ─
// Icons
// ─

const FAB_SVG      = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8 2 5 5 5 9c0 2 .8 3.8 2 5l-2 4h14l-2-4c1.2-1.2 2-3 2-5 0-4-3-7-7-7z"/><path d="M9 9h.01M15 9h.01"/><path d="M5 14c-1.5.5-3 .3-3-1s1.5-2 3-1.5"/><path d="M19 14c1.5.5 3 .3 3-1s-1.5-2-3-1.5"/></svg>`;
const EXPAND_SVG   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
const COLLAPSE_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 14h6v6M14 4h6v6M4 20l7-7M20 4l-7 7"/></svg>`;
const CLOSE_SVG    = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;

// ─
// Factory
// ─

interface PromptEntry {
  text: string;
  timestamp: number;
  patchCount: number;
  error: string | null;
}

export function createCuttlefishUI(
  intercept: InterceptInstance,
  config: CuttlefishConfig = {}
): void {
  if (!document.getElementById("__ctf_styles__")) {
    const style = document.createElement("style");
    style.id = "__ctf_styles__";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  let panelOpen    = false;
  let expanded     = false;
  let selectActive = false;
  let activeTab    = "patches";
  let promptHistory: PromptEntry[] = [];

  //  FAB 
  const fab = document.createElement("button");
  fab.id = "ctf-fab";
  fab.innerHTML = FAB_SVG;
  fab.title = "Kuttl";
  document.body.appendChild(fab);

  //  Panel 
  const panel = document.createElement("div");
  panel.id = "ctf-panel";
  panel.innerHTML = `
    <div id="ctf-header">
      <span id="ctf-title"><span class="ctf-dot"></span>Kuttl</span>
      <div id="ctf-header-actions">
        <button class="ctf-icon-btn" id="ctf-expand-btn" title="Expand">${EXPAND_SVG}</button>
        <button class="ctf-icon-btn" id="ctf-close-btn"  title="Close">${CLOSE_SVG}</button>
      </div>
    </div>

    <div id="ctf-prompt-wrap">
      <textarea id="ctf-prompt-input" placeholder="Describe a change… e.g. 'make the title larger'&#10;Ctrl+Enter to send"></textarea>
      <div id="ctf-prompt-status">Ready</div>
      <button id="ctf-send-btn">Send prompt</button>
    </div>

    <div id="ctf-actions">
      <button class="ctf-action" id="ctf-select-btn">⊕ Select</button>
      <button class="ctf-action" id="ctf-undo-btn">↩ Undo</button>
      <button class="ctf-action" id="ctf-save-btn">↓ Save</button>
      <button class="ctf-action danger" id="ctf-reset-btn">✕ Reset</button>
    </div>

    <div id="ctf-selection-bar">
      <span id="ctf-sel-text">No element selected</span>
      <button class="ctf-clear-sel" id="ctf-clear-sel">✕</button>
    </div>

    <div id="ctf-expanded-body">
      <div id="ctf-tabs">
        <button class="ctf-tab active" data-tab="patches">Patch history</button>
        <button class="ctf-tab"        data-tab="prompts">Prompt history</button>
      </div>
      <div class="ctf-tab-panel active" id="ctf-tab-patches"></div>
      <div class="ctf-tab-panel"        id="ctf-tab-prompts"></div>
    </div>
  `;
  document.body.appendChild(panel);

  //  Refs 
  const q = <T extends Element>(sel: string) => panel.querySelector<T>(sel)!;
  const promptInput  = q<HTMLTextAreaElement>("#ctf-prompt-input");
  const statusEl     = q<HTMLDivElement>("#ctf-prompt-status");
  const sendBtn      = q<HTMLButtonElement>("#ctf-send-btn");
  const selectBtn    = q<HTMLButtonElement>("#ctf-select-btn");
  const undoBtn      = q<HTMLButtonElement>("#ctf-undo-btn");
  const saveBtn      = q<HTMLButtonElement>("#ctf-save-btn");
  const resetBtn     = q<HTMLButtonElement>("#ctf-reset-btn");
  const selBar       = q<HTMLDivElement>("#ctf-selection-bar");
  const selText      = q<HTMLSpanElement>("#ctf-sel-text");
  const clearSelBtn  = q<HTMLButtonElement>("#ctf-clear-sel");
  const expandBtn    = q<HTMLButtonElement>("#ctf-expand-btn");
  const closeBtn     = q<HTMLButtonElement>("#ctf-close-btn");
  const patchPanel   = q<HTMLDivElement>("#ctf-tab-patches");
  const promptPanel  = q<HTMLDivElement>("#ctf-tab-prompts");

  //  Open / close 
  function openPanel()  { panelOpen = true;  panel.classList.add("visible");    fab.classList.add("open");    }
  
  function closePanel() { 
    console.log('close panel')
    panelOpen = false; 
    panel.classList.remove("visible"); 
    fab.classList.remove("open"); 

    // Clear everything when the panel is closed
    intercept.clearSelection();

    // Explicitly nuke the pin class regardless of intercept state
    document.querySelectorAll(".__ctf_pinned__").forEach(el =>
    el.classList.remove("__ctf_pinned__")
    );

    updateSel(null);
    if (selectActive) {
      selectActive = false;
      intercept.toggleSelect(); 
      selectBtn.classList.remove("active");
      selectBtn.textContent = "⊕ Select";
    }
  }

  fab.addEventListener("click", () => panelOpen ? closePanel() : openPanel());
  closeBtn.addEventListener("click", closePanel);
  
  document.addEventListener("click", (e) => {
    // Check selectActive so the panel doesn't close while picking an element
    if (panelOpen && !selectActive && !panel.contains(e.target as Node) && !fab.contains(e.target as Node))
      closePanel();
  }, true);

  //  Expand / collapse 
  function setExpanded(val: boolean) {
    expanded = val;
    panel.classList.toggle("expanded", expanded);
    expandBtn.innerHTML = expanded ? COLLAPSE_SVG : EXPAND_SVG;
    expandBtn.title     = expanded ? "Collapse" : "Expand";
    if (expanded) { renderPatchList(); renderPromptList(); }
  }
  expandBtn.addEventListener("click", () => setExpanded(!expanded));

  //  Tabs 
  panel.querySelectorAll(".ctf-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab = (tab as HTMLElement).dataset["tab"]!;
      panel.querySelectorAll(".ctf-tab,.ctf-tab-panel").forEach(el => el.classList.remove("active"));
      tab.classList.add("active");
      q(`#ctf-tab-${activeTab}`).classList.add("active");
    });
  });

  //  Status 
  function setStatus(text: string, cls = "") {
    statusEl.textContent = text;
    statusEl.className   = cls;
  }

  //  Send 
  async function sendPrompt() {
    const text = promptInput.value.trim();
    if (!text) return;

    sendBtn.disabled = true;
    setStatus("Thinking…", "loading");

    const entry: PromptEntry = { text, timestamp: Date.now(), patchCount: 0, error: null };

    try {
      const { result, status } = await intercept.prompt(text);
      if (status.state === "clarification_needed") {
        setStatus(status.question, "clarify");
        entry.error = status.question;
      } else if (status.state === "error") {
        setStatus(status.message, "err");
        entry.error = status.message;
      } else {
        entry.patchCount = result.patches.length;
        setStatus(`✓ ${result.patches.length} patch(es) applied`, "ok");
        if (expanded) renderPatchList();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg, "err");
      entry.error = msg;
    }

    promptHistory.unshift(entry);
    sendBtn.disabled  = false;
    promptInput.value = "";
    if (expanded) renderPromptList();
  }

  sendBtn.addEventListener("click", sendPrompt);
  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendPrompt(); }
  });

  //  Selection 
  function updateSel(el: SelectedElement | null) {
    if (!el) { selText.textContent = "No element selected"; selBar.classList.remove("has"); }
    else      { selText.textContent = `${el.tag}#${el.uid} — ${el.description}`; selBar.classList.add("has"); }
  }

  selectBtn.addEventListener("click", () => {
    if (selectActive) {
        // Toggle OFF manually
        selectActive = false;
        intercept.toggleSelect();
        intercept.clearSelection();
        updateSel(null);
        selectBtn.classList.remove("active");
        selectBtn.textContent = "⊕ Select";
    } else {
        // Toggle ON
        intercept.clearSelection();
        updateSel(null);
        selectActive = intercept.toggleSelect();
        selectBtn.classList.add("active");
        selectBtn.textContent = "● Selecting…";
    }
  });

  clearSelBtn.addEventListener("click", () => {
    intercept.clearSelection();
    updateSel(null);
    if (selectActive) {
      selectActive = false;
      intercept.toggleSelect();
      selectBtn.classList.remove("active");
      selectBtn.textContent = "⊕ Select";
    }
  });

  // Fast monitor for automatic cancellation when a selection is made
  setInterval(() => {
    if (selectActive && intercept.selection) {
      updateSel(intercept.selection);
      
      // The Selector.ts already disabled itself. Sync the UI state.
      selectActive = false;
      selectBtn.classList.remove("active");
      selectBtn.textContent = "⊕ Select";
    }
  }, 40);

  //  Undo / Save / Reset 
  undoBtn.addEventListener("click", async () => {
    const ok = await intercept.undo();
    setStatus(ok ? "✓ Undone" : "Nothing to undo", ok ? "ok" : "");
    if (expanded) renderPatchList();
  });

  saveBtn.addEventListener("click", () => {
    const count = JSON.parse(intercept.export()).length;
    setStatus(`✓ Saved ${count} patch(es)`, "ok");
    saveBtn.textContent = "✓ Saved";
    saveBtn.classList.add("saved");
    setTimeout(() => { saveBtn.textContent = "↓ Save"; saveBtn.classList.remove("saved"); }, 1800);
  });

  resetBtn.addEventListener("click", () => {
    intercept.reset();
    intercept.clearSelection();
    updateSel(null);
    setStatus("Reset to source");
    if (expanded) renderPatchList();
  });

  //  Render lists 
  function renderPatchList() {
    const patches = intercept.store.getAll();
    if (!patches.length) { patchPanel.innerHTML = `<div class="ctf-empty">No patches applied yet</div>`; return; }
    patchPanel.innerHTML = patches.map(p => `
      <div class="ctf-patch-item">
        <span class="ctf-patch-op">${p.op}</span>
        <span class="ctf-patch-target">${p.target}</span>
        <span class="ctf-patch-src">${p.source}</span>
        <button class="ctf-patch-rm" data-id="${p.id}">✕</button>
      </div>`).join("");
    patchPanel.querySelectorAll(".ctf-patch-rm").forEach(btn =>
      btn.addEventListener("click", () => {
        intercept.unpatch((btn as HTMLElement).dataset["id"]!);
        renderPatchList();
      })
    );
  }

  function renderPromptList() {
    if (!promptHistory.length) { promptPanel.innerHTML = `<div class="ctf-empty">No prompts sent yet</div>`; return; }
    promptPanel.innerHTML = promptHistory.map(e => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      const meta = e.error
        ? `<span class="err">✕ ${e.error.slice(0, 50)}</span>`
        : `<span class="ok">✓ ${e.patchCount} patch(es)</span>`;
      return `<div class="ctf-prompt-item">
        <div class="ctf-prompt-text">${e.text}</div>
        <div class="ctf-prompt-meta"><span>${time}</span>${meta}</div>
      </div>`;
    }).join("");
  }
}