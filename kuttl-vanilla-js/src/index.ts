import type {
  InterceptConfig,
  InterceptNode,
  ElementNode,
  Patch,
  PatchStore,
  AIProviderConfig,
  AIPromptResult,
  AIStatus,
  SelectedElement,
} from "./types/index";
import { captureTree } from "./core/capture";
import { createPatchStore } from "./core/store";
import { applyPatches, generateSemanticPatches } from "./core/engine";
import { previewPatches, type PreviewResult } from "./core/preview";
import { reconcile } from "./core/reconciler";
import { createAILayer } from "./core/ai";
import { createSelector, type SelectorHandle } from "./core/selector";
import { createWebsiteSerializer, type WebsiteSerializer } from "./core/serializer";
import { SnapshotAPI, generateWebsiteId, generateUserId } from "./core/api";
import { deepClone, generatePatchId } from "./utils/index";

// ─────────────────────────────────────────────
// Public API surface
// ─────────────────────────────────────────────

export interface InterceptInstance {
  patch(patches: Patch | Patch[]): Promise<{ warnings: string[] }>;
  unpatch(patchId: string): Promise<boolean>;
  undo(): Promise<boolean>;
  reset(): void;
  export(): string;
  import(json: string): Promise<void>;
  preview(patches: Patch | Patch[]): PreviewResult;
  generateSemanticPatches(operation: string, targetUid: string): Patch[];

  /** Send a natural language prompt. Requires ai config at init. */
  prompt(userPrompt: string): Promise<{ result: AIPromptResult; status: AIStatus }>;

  /**
   * Toggle click-to-select mode. While active, hovering highlights
   * elements and clicking pins the selection, which is automatically
   * included as context in the next prompt() call.
   */
  toggleSelect(): boolean;

  /** Manually clear the current selection. */
  clearSelection(): void;

  /** Returns the currently selected element, or null. */
  readonly selection: SelectedElement | null;

  readonly store: PatchStore;
  readonly sourceSnapshot: Readonly<InterceptNode>;

  // ─────────────────────────────────────────────
  // Website Serialization API
  // ─────────────────────────────────────────────

  /** Create a complete website snapshot with full context */
  createSnapshot(websiteId: string, userId: string, sessionId?: string, promptContext?: import('./types/serialization').PromptContext): import('./types/serialization').WebsiteSnapshot;

  /** Create a diff between current state and last snapshot */
  createDiff(): import('./types/serialization').SnapshotDiff | null;

  /** Apply a diff to update the state incrementally */
  applyDiff(diff: import('./types/serialization').SnapshotDiff): void;

  /** Get the last created snapshot */
  readonly lastSnapshot: import('./types/serialization').WebsiteSnapshot | null;
}

// ─────────────────────────────────────────────
// init()
// ─────────────────────────────────────────────

export function init(userConfig: InterceptConfig = {}): InterceptInstance {
  console.log("[InterceptJS DEBUG] Raw userConfig received:", userConfig);
  const config = resolveConfig(userConfig);
  console.log("[InterceptJS DEBUG] Resolved config:", config);

  // Step 1: Capture
  const sourceSnapshot = Object.freeze(
    captureTree(config.root, {
      uidAttribute: config.uidAttribute,
      skipTags: config.skipTags,
    })
  );

  // Step 2: Working tree
  let workingTree: InterceptNode = deepClone(sourceSnapshot);

  // Step 3: Store
  const store = createPatchStore();

  // Hydrate persisted patches
  if (config.persistKey) {
    const stored = localStorage.getItem(persistenceKey(config.persistKey, config.root));
    if (stored) {
      try {
        store.hydrate(stored);
        const result = applyPatches(sourceSnapshot, store.getAll());
        workingTree = result.tree;
        if (config.debug && result.warnings.length > 0)
          console.warn("[InterceptJS] Hydration warnings:", result.warnings);
        reconcile(deepClone(sourceSnapshot), workingTree, config.debug);
      } catch (err) {
        console.warn("[InterceptJS] Failed to hydrate:", err);
      }
    }
  }

  // AI layer — shares the same base URL as the snapshot API
  const aiLayer = createAILayer(config.websiteKey ?? undefined, config.snapshot?.api?.baseUrl);

  // Website serializer
  const serializer = createWebsiteSerializer({
    uidAttribute: config.uidAttribute,
    descriptionAttribute: config.descriptionAttribute,
  });

  // Automatic snapshotting setup
  let snapshotAPI: SnapshotAPI | null = null;
  let lastSnapshotTime = 0;
  const websiteId = config.snapshot?.websiteId || generateWebsiteId();
  const userId = config.snapshot?.userId || generateUserId();
  
  console.log("[InterceptJS DEBUG] Snapshot config check:", {
    enabled: config.snapshot?.enabled,
    hasApi: !!config.snapshot?.api,
    websiteId,
    userId
  });
  
  if (config.snapshot?.enabled && config.snapshot?.api) {
    console.log("[InterceptJS DEBUG] Creating SnapshotAPI instance");
    snapshotAPI = new SnapshotAPI({
      ...config.snapshot.api,
      ...(config.websiteKey ? { websiteKey: config.websiteKey } : {}),
    });
    
    if (config.debug) {
      console.log("[InterceptJS] Automatic snapshotting enabled", {
        websiteId,
        userId,
        apiUrl: config.snapshot.api.baseUrl
      });
    }
  } else {
    console.log("[InterceptJS DEBUG] Snapshot API not created:", {
      enabled: config.snapshot?.enabled,
      hasApi: !!config.snapshot?.api
    });
  }

  // Click-to-select
  let currentSelection: SelectedElement | null = null;

  const selector: SelectorHandle = createSelector(config.root, {
    uidAttribute: config.uidAttribute,
    descriptionAttribute: config.descriptionAttribute,
    onSelect: (el) => {
      currentSelection = el;
      if (config.onSelect) config.onSelect(el);
    },
  });

  // Undo stack
  const undoStack: string[] = [];

  // ─── Automatic Snapshotting ─────────────────

  async function createAndSendSnapshot(force = false, promptContext?: import('./types/serialization').PromptContext): Promise<void> {
    console.log("[InterceptJS DEBUG] createAndSendSnapshot called:", {
      force,
      hasSnapshotAPI: !!snapshotAPI,
      snapshotEnabled: config.snapshot?.enabled
    });
    
    if (!snapshotAPI || !config.snapshot?.enabled) {
      console.log("[InterceptJS DEBUG] Snapshot creation aborted:", {
        snapshotAPI: !!snapshotAPI,
        enabled: config.snapshot?.enabled
      });
      return;
    }

    // Skip if a snapshot already exists for this website
    if (await snapshotAPI.hasSnapshot(websiteId)) {
      if (config.debug) console.log("[InterceptJS] Snapshot already exists for this website — skipping.");
      return;
    }
    
    const now = Date.now();
    const throttleMs = config.snapshot.throttleMs || 5000;
    
    if (!force && (now - lastSnapshotTime) < throttleMs) {
      if (config.debug) {
        console.log("[InterceptJS] Snapshot throttled, skipping");
      }
      return;
    }
    
    try {
      // Create automatic prompt context if not provided
      const autoPromptContext = promptContext || {
        promptText: "",
        promptType: "manual_change",
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        triggerType: force ? "auto_sync" : "manual",
      };

      const snapshot = serializer.createSnapshot(
        workingTree,
        store.getAll(),
        config.root,
        websiteId,
        userId,
        generatePatchId(),
        autoPromptContext
      );
      
      if (config.debug) {
        console.log("[InterceptJS] Creating snapshot", {
          componentsCount: snapshot.components.length,
          sessionId: snapshot.metadata.sessionId
        });
      }
      
      console.log("[InterceptJS DEBUG] Sending snapshot to API:", snapshot);
      const result = await snapshotAPI.createSnapshot(snapshot);
      console.log("[InterceptJS DEBUG] API response:", result);
      
      if (result.success) {
        lastSnapshotTime = now;
        
        if (config.debug) {
          console.log("[InterceptJS] Snapshot sent successfully", {
            snapshotId: result.snapshotId
          });
        }
        
        // Note: Embedding generation is handled automatically by the API server in background
      } else {
        console.warn("[InterceptJS] Snapshot creation failed:", result.error);
      }
    } catch (error) {
      console.warn("[InterceptJS] Snapshot creation error:", error);
    }
  }

  // ─── Internal ────────────────────────────────

  function countNodes(node: InterceptNode): number {
    if (node.nodeType === "text") return 1;
    return 1 + (node as ElementNode).children.reduce((sum: number, child: InterceptNode) => sum + countNodes(child), 0);
  }

  async function addLayoutContextToTree(tree: InterceptNode, domRoot: Element): Promise<InterceptNode> {
    const enhancedTree = deepClone(tree);
    
    function addLayoutContextToNode(node: InterceptNode) {
      if (node.nodeType === "element") {
        const elementNode = node as ElementNode;
        const domElement = domRoot.querySelector(`[${config.uidAttribute}="${elementNode.uid}"]`);
        
        if (domElement) {
          const computedStyle = window.getComputedStyle(domElement);
          const parent = domElement.parentElement;
          const parentComputedStyle = parent ? window.getComputedStyle(parent) : null;

          // Create layout context similar to serializer
          (elementNode as any).layoutContext = {
            display: computedStyle.display,
            position: computedStyle.position,
            parentDisplay: parentComputedStyle?.display || "block",
            isGridChild: parentComputedStyle?.display.includes("grid") || false,
            isFlexChild: parentComputedStyle?.display.includes("flex") || false,
            isLayoutContainer: ["grid", "flex", "table"].some(display => computedStyle.display.includes(display)),
            layoutRole: detectLayoutRole(domElement),
            gridArea: computedStyle.gridArea !== "auto" ? computedStyle.gridArea : undefined,
            flexGrow: computedStyle.flexGrow !== "0" ? computedStyle.flexGrow : undefined,
            flexShrink: computedStyle.flexShrink !== "1" ? computedStyle.flexShrink : undefined,
            flexBasis: computedStyle.flexBasis !== "auto" ? computedStyle.flexBasis : undefined,
          };

          // Debug log for important elements
          if ((elementNode as any).layoutContext.layoutRole === "sidebar") {
            console.log("[🎯 Enhanced Tree] Added layout context to sidebar:", elementNode.uid, (elementNode as any).layoutContext);
          }
        }
        
        // Recursively process children
        elementNode.children.forEach(addLayoutContextToNode);
      }
    }
    
    addLayoutContextToNode(enhancedTree);
    return enhancedTree;
  }

  function detectLayoutRole(element: Element): string {
    const classes = (element.className || "").toString().toLowerCase();
    
    if (classes.includes("sidebar") || classes.includes("aside")) return "sidebar";
    if (classes.includes("navbar") || classes.includes("header")) return "navbar";
    if (classes.includes("footer")) return "footer";
    if (classes.includes("modal") || classes.includes("dialog")) return "modal";
    if (classes.includes("main") || classes.includes("content")) return "main";
    
    return "unknown";
  }

  async function applyAndReconcile(_patches: Patch[]): Promise<{ warnings: string[] }> {
    const old = workingTree;
    
    if (config.debug) {
      console.log("[InterceptJS] 🔍 About to apply patches:", _patches);
      console.log("[InterceptJS] 🌳 Current tree has", countNodes(sourceSnapshot), "nodes");
    }
    
    // Create enhanced snapshot with layout context for layout analysis
    let enhancedSnapshot: InterceptNode = sourceSnapshot;
    try {
      console.log("[🔧 Layout Analysis] Enhancing snapshot with layout context...");
      enhancedSnapshot = await addLayoutContextToTree(sourceSnapshot, config.root);
      console.log("[🔧 Layout Analysis] Enhanced snapshot created with layout context");
    } catch (error) {
      console.warn("[🔧 Layout Analysis] Failed to enhance snapshot, using basic snapshot:", error);
    }
    
    const { tree, warnings, enhancedPatches } = applyPatches(enhancedSnapshot, store.getAll(), config.root);
    workingTree = tree;
    reconcile(old, workingTree, config.debug);

    if (config.debug) {
      console.log("[InterceptJS] ✅ Applied patches. Results:");
      console.log("  Original patches:", _patches.length);
      console.log("  Enhanced patches:", enhancedPatches.length);
      console.log("  Warnings:", warnings.length);
      
      if (warnings.length > 0) {
        console.warn("[InterceptJS] ⚠️ Engine warnings:", warnings);
      }
      if (enhancedPatches.length > _patches.length) {
        console.log("[InterceptJS] 🛡️ Layout safety: Applied additional patches to prevent layout breaks");
        console.log("  Additional patches:", enhancedPatches.slice(_patches.length));
      }
    }

    persist(config, store, config.root);

    // Automatic snapshot on changes
    if (_patches.length > 0 && config.snapshot?.onChanges !== false) {
      createAndSendSnapshot().catch(error => {
        if (config.debug) {
          console.warn("[InterceptJS] Auto-snapshot on changes failed:", error);
        }
      });
    }

    return { warnings };
  }

  // ─── Public API ──────────────────────────────

  const instance = {
    get store()          { return store; },
    get sourceSnapshot() { return sourceSnapshot; },
    get selection()      { return currentSelection; },

    async patch(input: Patch | Patch[]): Promise<{ warnings: string[] }> {
      const patches = Array.isArray(input) ? input : [input];
      for (const p of patches) {
        const patch: Patch = {
          ...p,
          id: p.id ?? generatePatchId(),
          timestamp: p.timestamp ?? Date.now(),
        };
        store.add(patch);
        undoStack.push(patch.id);
      }
      return await applyAndReconcile(patches);
    },

    async unpatch(patchId: string): Promise<boolean> {
      const removed = store.remove(patchId);
      if (removed) await applyAndReconcile([]);
      return removed;
    },

    async undo(): Promise<boolean> {
      const lastId = undoStack.pop();
      if (!lastId) return false;
      const removed = store.remove(lastId);
      if (removed) await applyAndReconcile([]);
      return removed;
    },

    reset(): void {
      store.clear();
      undoStack.length = 0;
      const old = workingTree;
      workingTree = deepClone(sourceSnapshot);
      reconcile(old, workingTree, config.debug);
      persist(config, store, config.root);
    },

    preview(patches: Patch | Patch[]): PreviewResult {
      const patchArray = Array.isArray(patches) ? patches : [patches];
      return previewPatches(workingTree, patchArray, config.root);
    },

    generateSemanticPatches(operation: string, targetUid: string): Patch[] {
      return generateSemanticPatches(workingTree, operation, targetUid, config.root);
    },

    export(): string  { return store.serialize(); },

    async import(json: string): Promise<void> {
      store.hydrate(json);
      await applyAndReconcile([]);
    },

    async prompt(userPrompt: string) {
      if (!aiLayer) {
        throw new Error(
          "[InterceptJS] prompt() called but no AI config was provided at init(). " +
          "Pass an `ai` config object with provider and apiKey."
        );
      }

      // Create enhanced tree with layout context for AI
      let enhancedTree = workingTree;
      try {
        console.log("[🔧 AI Enhancement] Creating enhanced tree with layout context...");
        // Create a simple enhanced version by adding layout context to the existing tree
        enhancedTree = await addLayoutContextToTree(workingTree, config.root);
        console.log("[🔧 AI Enhancement] Enhanced tree created with", countNodes(enhancedTree), "nodes");
      } catch (error) {
        console.warn("[🔧 AI Enhancement] Failed to create enhanced tree, using basic tree:", error);
      }

      const { result, status } = await aiLayer.prompt(
        userPrompt,
        enhancedTree,           // Send enhanced tree instead of basic workingTree
        config.descriptionAttribute,
        currentSelection,       // passes selected element as context
        websiteId              // passes website ID for embedding context
      );

      if (result.patches.length > 0) {
        for (const patch of result.patches) {
          store.add(patch);
          undoStack.push(patch.id);
        }
        await applyAndReconcile(result.patches);
      }

      // Create automatic snapshot with AI prompt context
      const promptContext: import('./types/serialization').PromptContext = {
        promptText: userPrompt,
        promptType: "ai_modification",
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        triggerType: "ai_prompt",
        metadata: {
          patchesApplied: result.patches.length,
          warnings: result.warnings.length,
          status: status
        },
        ...(currentSelection?.uid && { selectedElementUID: currentSelection.uid })
      };

      if (config.snapshot?.enabled) {
        createAndSendSnapshot(true, promptContext).catch(error => {
          if (config.debug) {
            console.warn("[InterceptJS] AI prompt snapshot failed:", error);
          }
        });
      }

      if (config.debug) {
        console.group("[InterceptJS] AI prompt");
        console.log("Prompt:", userPrompt);
        console.log("Selected element:", currentSelection?.uid ?? "none");
        console.log("Status:", status);
        console.log("Patches applied:", result.patches.length);
        if (result.warnings.length) console.warn("Warnings:", result.warnings);
        console.log("Raw:", result.raw);
        console.groupEnd();
      }

      return { result, status };
    },

    toggleSelect(): boolean {
      if (selector.isEnabled()) {
        selector.disable();
        return false;
      } else {
        selector.enable();
        return true;
      }
    },

    clearSelection(): void {
      currentSelection = null;
      if (config.onSelect) config.onSelect(null);
    },

    // ─────────────────────────────────────────────
    // Website Serialization Methods
    // ─────────────────────────────────────────────

    createSnapshot(websiteId: string, userId: string, sessionId?: string, promptContext?: import('./types/serialization').PromptContext) {
      return serializer.createSnapshot(
        workingTree,
        store.getAll(),
        config.root,
        websiteId,
        userId,
        sessionId || generatePatchId(),
        promptContext
      );
    },

    createDiff() {
      const currentSnapshot = this.createSnapshot("temp", "temp");
      return serializer.createDiff(currentSnapshot);
    },

    applyDiff(diff: import('./types/serialization').SnapshotDiff) {
      // For now, this would apply the diff to the current state
      // In a full implementation, this would update the working tree
      // and reconcile changes with the DOM
      if (config.debug) {
        console.log("[InterceptJS] Applying snapshot diff:", diff);
      }
    },

    get lastSnapshot() {
      return serializer['lastSnapshot']; // Access private property for read-only access
    },
  };

  // Create initial snapshot after instance is created
  console.log("[InterceptJS DEBUG] Checking if initial snapshot should be created:", {
    enabled: config.snapshot?.enabled
  });
  
  if (config.snapshot?.enabled) {
    console.log("[InterceptJS DEBUG] Scheduling initial snapshot in 100ms");
    // Use setTimeout to ensure the DOM is fully ready and avoid blocking initialization
    setTimeout(() => {
      console.log("[InterceptJS DEBUG] Initial snapshot timeout fired - calling createAndSendSnapshot");
      createAndSendSnapshot(true).catch(error => {
        console.error("[InterceptJS DEBUG] Initial snapshot failed with error:", error);
        if (config.debug) {
          console.warn("[InterceptJS] Initial snapshot creation failed:", error);
        }
      });
    }, 100);
  } else {
    console.log("[InterceptJS DEBUG] Initial snapshot NOT scheduled - snapshot not enabled");
  }

  return instance;
}

// Re-export types
export type {
  InterceptConfig,
  AIProviderConfig,
  AIPromptResult,
  AIStatus,
  Patch,
  InterceptNode,
  ElementNode,
  TextNode,
  SelectedElement,
} from "./types/index";

// Re-export serialization types
export type {
  WebsiteSnapshot,
  ComponentState,
  SnapshotDiff,
  StyleSnapshot,
  LayoutStructure,
  CustomizationLayer,
} from "./types/serialization";

// ─────────────────────────────────────────────
// Config resolution
// ─────────────────────────────────────────────

interface ResolvedConfig {
  root: Element;
  uidAttribute: string;
  descriptionAttribute: string;
  skipTags: string[];
  persistKey: string | null;
  debug: boolean;
  ai: AIProviderConfig | null;
  websiteKey: string | null;
  onSelect: ((el: SelectedElement | null) => void) | null;
  snapshot: {
    enabled: boolean;
    api: {
      baseUrl: string;
      apiKey?: string;
      timeout?: number;
    } | null;
    websiteId?: string;
    userId?: string;
    onChanges: boolean;
    throttleMs: number;
  };
}

function resolveConfig(config: InterceptConfig): ResolvedConfig {
  return {
    root:                 config.root                ?? document.body,
    uidAttribute:         config.uidAttribute        ?? "data-uid",
    descriptionAttribute: config.descriptionAttribute ?? "data-description",
    skipTags:             config.skipTags             ?? [],
    persistKey:           config.persistKey           ?? null,
    debug:                config.debug               ?? false,
    ai:                   config.ai                  ?? null,
    websiteKey:           config.websiteKey           ?? null,
    onSelect:             config.onSelect            ?? null,
    snapshot: {
      enabled:            config.snapshot?.enabled   ?? false,
      api:                config.snapshot?.api       ?? null,
      ...(config.snapshot?.websiteId && { websiteId: config.snapshot.websiteId }),
      ...(config.snapshot?.userId && { userId: config.snapshot.userId }),
      onChanges:          config.snapshot?.onChanges ?? true,
      throttleMs:         config.snapshot?.throttleMs ?? 5000,
    },
  };
}

// ─────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────

function persistenceKey(prefix: string, root: Element): string {
  const path   = window.location.pathname;
  const rootId = root.id ? `#${root.id}` : root.tagName.toLowerCase();
  return `${prefix}:${path}:${rootId}`;
}

function persist(config: ResolvedConfig, store: PatchStore, root: Element): void {
  if (!config.persistKey) return;
  try {
    localStorage.setItem(persistenceKey(config.persistKey, root), store.serialize());
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError")
      console.warn("[InterceptJS] localStorage quota exceeded.");
  }
}