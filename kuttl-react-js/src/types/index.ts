// ─────────────────────────────────────────────
// Patch types (shared with cuttlefish core)
// ─────────────────────────────────────────────

export type PatchOp =
  | "restyle"
  | "reorder"
  | "move"
  | "hide"
  | "show"
  | "setText"
  | "addClass"
  | "removeClass";

export type PatchSource = "ai" | "manual" | "user";

export interface BasePatch {
  id: string;
  op: PatchOp;
  target: string; // data-uid value
  timestamp: number;
  source: PatchSource;
}

export interface RestylePatch extends BasePatch {
  op: "restyle";
  payload: { styles: Record<string, string> };
}

export interface ReorderPatch extends BasePatch {
  op: "reorder";
  payload: { order: string[] };
}

export interface MovePatch extends BasePatch {
  op: "move";
  payload: { newParent: string; index: number };
}

export interface HidePatch extends BasePatch {
  op: "hide";
  payload: Record<string, never>;
}

export interface ShowPatch extends BasePatch {
  op: "show";
  payload: Record<string, never>;
}

export interface SetTextPatch extends BasePatch {
  op: "setText";
  payload: { text: string };
}

export interface AddClassPatch extends BasePatch {
  op: "addClass";
  payload: { classes: string[] };
}

export interface RemoveClassPatch extends BasePatch {
  op: "removeClass";
  payload: { classes: string[] };
}

export type Patch =
  | RestylePatch
  | ReorderPatch
  | MovePatch
  | HidePatch
  | ShowPatch
  | SetTextPatch
  | AddClassPatch
  | RemoveClassPatch;

// ─────────────────────────────────────────────
// AI types
// ─────────────────────────────────────────────

export type AIProvider = "anthropic" | "openai" | "gemini";

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  systemPromptExtra?: string;
}

export interface AIPromptResult {
  patches: Patch[];
  raw: string;
  warnings: string[];
}

export type AIStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "clarification_needed"; question: string };

// ─────────────────────────────────────────────
// React adapter specific types
// ─────────────────────────────────────────────

/**
 * The shape stored per uid in the patch index.
 * Built by collapsing all patches for a given uid into one resolved override.
 */
export interface ResolvedOverrides {
  styles?: Record<string, string>;
  classesToAdd?: string[];
  classesToRemove?: string[];
  hidden?: boolean;
  text?: string;
  order?: string[];   // child uid order (for opt-in reorder)
  moved?: boolean;    // signals this uid should be rendered at a new parent
}

/**
 * The full index: uid → resolved overrides.
 * Recomputed whenever the patch list changes.
 */
export type OverrideIndex = Map<string, ResolvedOverrides>;

export interface CuttlefishContextValue {
  /** Get resolved overrides for a uid */
  getOverrides(uid: string): ResolvedOverrides | undefined;

  /** Full override index — for opt-in structural hooks */
  overrideIndex: OverrideIndex;

  /** Apply patches programmatically */
  patch(patches: Patch | Patch[]): void;

  /** Undo last patch */
  undo(): void;

  /** Reset all patches */
  reset(): void;

  /** Current patch list */
  patches: Patch[];

  /** Send an AI prompt */
  prompt(text: string): Promise<{ result: AIPromptResult; status: AIStatus }>;

  /** Currently selected element uid (click-to-select) */
  selectedUid: string | null;

  /** Toggle click-to-select mode */
  toggleSelect(): void;

  /** Clear current selection */
  clearSelection(): void;
}

export interface CuttlefishProviderProps {
  children: React.ReactNode;
  ai?: AIProviderConfig;
  persistKey?: string;
  debug?: boolean;
  /** uid attribute name — defaults to 'data-uid' */
  uidAttribute?: string;
}

export interface UseCuttlefishReturn {
  /** Merged style object to spread onto the element */
  style: React.CSSProperties;
  /** Extra class names to add */
  addedClasses: string[];
  /** Class names to remove */
  removedClasses: string[];
  /** Whether this element is hidden by a patch */
  hidden: boolean;
  /** Patched text content (undefined = use original) */
  text: string | undefined;
  /** Reorder children by uid — for opt-in structural patching */
  reorder<T extends React.ReactNode>(children: T[]): T[];
}
