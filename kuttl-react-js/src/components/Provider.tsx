import * as React from "react";
import type {
  CuttlefishContextValue,
  CuttlefishProviderProps,
  Patch,
  OverrideIndex,
  AIPromptResult,
  AIStatus,
} from "../types/index.js";
import { createPatchStore, generatePatchId } from "../core/store.js";
import { buildOverrideIndex } from "../core/overrides.js";
import { installInterceptor, uninstallInterceptor } from "../core/interceptor.js";
import { sendAIPrompt } from "../core/ai.js";

// Context

const CuttlefishContext = React.createContext<CuttlefishContextValue | null>(null);
CuttlefishContext.displayName = "CuttlefishContext";

// Provider

export function CuttlefishProvider({
  children,
  ai,
  persistKey,
  debug = true,
  uidAttribute = "data-uid",
}: CuttlefishProviderProps): React.ReactElement {
  // Stable store — never recreated
  const store = React.useMemo(() => createPatchStore(), []);

  // Patch list drives re-renders
  const [patches, setPatches] = React.useState<Patch[]>(() => {
    if (persistKey) {
      const key = storageKey(persistKey);
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          store.hydrate(stored);
          return store.getAll();
        } catch { /* ignore corrupt stored data */ }
      }
    }
    return [];
  });

  // Override index — derived from patch list, updated synchronously
  const overrideIndex = React.useMemo<OverrideIndex>(
    () => buildOverrideIndex(patches),
    [patches]
  );

  // indexRef — the interceptor reads this on every createElement call.
  // Using a ref means the interceptor always sees the latest index without
  // needing to be re-installed when patches change.
  const indexRef = React.useRef<OverrideIndex>(overrideIndex);
  indexRef.current = overrideIndex;

  // Undo stack
  const undoStack = React.useRef<string[]>([]);

  // Selected element uid
  const [selectedUid, setSelectedUid] = React.useState<string | null>(null);
  const selectActive   = React.useRef(false);
  const overlayRef     = React.useRef<HTMLElement | null>(null);

  // Provider.tsx — add this effect

  React.useEffect(() => {
    if (patches.length === 0) return;
  
    const index = overrideIndex;
  
    index.forEach((override, uid) => {
      const el = document.querySelector(
        `[${uidAttribute}="${uid}"]`
      ) as HTMLElement | null;
  
      if (!el) return;
  
      //  Hide / Show 
      if (override.hidden !== undefined) {
        el.style.display = override.hidden ? "none" : "";
      }
  
      //  Restyle 
      if (override.styles) {
        for (const [prop, value] of Object.entries(override.styles)) {
          el.style.setProperty(prop, value);
        }
      }
  
      //  AddClass 
      if (override.classesToAdd?.length) {
        el.classList.add(...override.classesToAdd);
      }
  
      //  RemoveClass 
      if (override.classesToRemove?.length) {
        el.classList.remove(...override.classesToRemove);
      }
  
      //  SetText 
      if (override.text !== undefined) {
        const node = el.firstChild;
  
        // Only replace if it's a single text node
        if (node?.nodeType === Node.TEXT_NODE && el.childNodes.length === 1) {
          node.textContent = override.text;
        }
      }
    });
  }, [overrideIndex, patches, uidAttribute]);

  // Install createElement interceptor once on mount
  React.useEffect(() => {
    installInterceptor(indexRef, uidAttribute);
    return () => { uninstallInterceptor(); };
  }, [uidAttribute]);

  // Persist patches when they change
  React.useEffect(() => {
    if (!persistKey) return;
    try {
      localStorage.setItem(storageKey(persistKey), store.serialize());
    } catch (e) {
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        console.warn("[Cuttlefish] localStorage quota exceeded");
      }
    }
  }, [patches, persistKey, store]);

  //  Internal helpers 

  function syncPatches() {
    setPatches(store.getAll());
  }

  function addPatches(incoming: Patch[]) {
    for (const p of incoming) {
      store.add(p);
      undoStack.current.push(p.id);
    }
    syncPatches();
  }

  //  Public API 

  function patch(input: Patch | Patch[]) {
    const list = Array.isArray(input) ? input : [input];
    const stamped = list.map((p) => ({
      ...p,
      id:        p.id        ?? generatePatchId(),
      timestamp: p.timestamp ?? Date.now(),
    }));
    addPatches(stamped);
    if (debug) console.log("[Cuttlefish] patch", stamped);
  }

  function undo() {
    const lastId = undoStack.current.pop();
    if (!lastId) return;
    store.remove(lastId);
    syncPatches();
  }

  function reset() {
    store.clear();
    undoStack.current = [];
    syncPatches();
    clearSelection();
  }

  async function prompt(text: string): Promise<{ result: AIPromptResult; status: AIStatus }> {
    if (!ai) throw new Error("[Cuttlefish] prompt() called without ai config in CuttlefishProvider");

    const root = document.body; // serialiser walks from body
    const { result, status } = await sendAIPrompt(
      text, ai, root, uidAttribute, overrideIndex, selectedUid, ai.systemPromptExtra
    );

    if (result.patches.length > 0) addPatches(result.patches);

    if (debug) {
      console.group("[Cuttlefish] AI prompt");
      console.log("Prompt:", text);
      console.log("Status:", status);
      console.log("Patches:", result.patches.length);
      if (result.warnings.length) console.warn("Warnings:", result.warnings);
      console.groupEnd();
    }

    return { result, status };
  }

  //  Click-to-select 

  function buildOverlay(): HTMLElement {
    if (overlayRef.current) return overlayRef.current;
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "fixed", pointerEvents: "none", zIndex: "2147483630",
      border: "2px solid #22c55e", background: "rgba(34,197,94,0.06)",
      borderRadius: "2px", display: "none", boxSizing: "border-box",
      transition: "all 0.08s ease",
    });
    document.body.appendChild(el);
    overlayRef.current = el;
    return el;
  }

  function positionOverlay(target: Element) {
    const overlay = buildOverlay();
    const rect = target.getBoundingClientRect();
    Object.assign(overlay.style, {
      display: "block",
      top:    `${rect.top    + window.scrollY}px`,
      left:   `${rect.left   + window.scrollX}px`,
      width:  `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  function hideOverlay() {
    if (overlayRef.current) overlayRef.current.style.display = "none";
  }

  const onMouseOver = React.useCallback((e: MouseEvent) => {
    if (!selectActive.current) return;
    const target = (e.target as Element).closest(`[${uidAttribute}]`);
    if (target) { e.stopPropagation(); positionOverlay(target); }
  }, [uidAttribute]);

  const onClick = React.useCallback((e: MouseEvent) => {
    if (!selectActive.current) return;
    const target = (e.target as Element).closest(`[${uidAttribute}]`);
    if (!target) return;
    e.preventDefault(); e.stopPropagation();
    const uid = target.getAttribute(uidAttribute)!;
    setSelectedUid(uid);
    // Flash confirmation
    if (overlayRef.current) {
      overlayRef.current.style.background = "rgba(34,197,94,0.2)";
      setTimeout(() => { if (overlayRef.current) overlayRef.current.style.background = "rgba(34,197,94,0.06)"; }, 200);
    }
  }, [uidAttribute]);

  function toggleSelect() {
    selectActive.current = !selectActive.current;
    if (selectActive.current) {
      document.addEventListener("mouseover", onMouseOver, true);
      document.addEventListener("click",     onClick,     true);
      document.body.style.cursor = "crosshair";
    } else {
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("click",     onClick,     true);
      document.body.style.cursor = "";
      hideOverlay();
    }
  }

  function clearSelection() {
    setSelectedUid(null);
    hideOverlay();
  }

  // Cleanup overlay on unmount
  React.useEffect(() => {
    return () => {
      overlayRef.current?.remove();
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("click",     onClick,     true);
      document.body.style.cursor = "";
    };
  }, [onMouseOver, onClick]);

  //  Context value 

  const value = React.useMemo<CuttlefishContextValue>(() => ({
    getOverrides: (uid) => overrideIndex.get(uid),
    overrideIndex,
    patch,
    undo,
    reset,
    patches,
    prompt,
    selectedUid,
    toggleSelect,
    clearSelection,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [overrideIndex, patches, selectedUid]);

  return React.createElement(CuttlefishContext.Provider, { value }, children);
}

// ─
// Hook — useCuttlefishContext
// ─

export function useCuttlefishContext(): CuttlefishContextValue {
  const ctx = React.useContext(CuttlefishContext);
  if (!ctx) throw new Error("[Cuttlefish] useCuttlefishContext must be used inside <CuttlefishProvider>");
  return ctx;
}

// ─
// Helpers
// ─

function storageKey(prefix: string): string {
  return `cuttlefish:${prefix}:${window.location.pathname}`;
}
