// ─────────────────────────────────────────────
// Website Serialization Types
// ─────────────────────────────────────────────

import type { InterceptNode, ElementNode, Patch } from "./index";

// ─────────────────────────────────────────────
// Core Snapshot Interface
// ─────────────────────────────────────────────

export interface WebsiteSnapshot {
  /** Complete component tree state */
  components: ComponentState[];
  
  /** CSS rules and computed styles */
  styles: StyleSnapshot;
  
  /** Layout structure and positioning */
  layout: LayoutStructure;
  
  /** User customizations and patches */
  userCustomizations: CustomizationLayer;
  
  /** Snapshot metadata */
  metadata: SnapshotMetadata;
  
  /** Prompt context (new fields) */
  promptContext?: PromptContext;
}

// ─────────────────────────────────────────────
// Component State
// ─────────────────────────────────────────────

export interface ComponentState {
  /** Unique identifier from existing uid system */
  uid: string;
  
  /** Element information */
  element: SerializedElementNode;
  
  /** Current visual state */
  visualState: VisualState;
  
  /** Relationship data */
  relationships: ComponentRelationships;
  
  /** Interaction capabilities */
  interactions: InteractionCapabilities;
}

export interface SerializedElementNode {
  /** From existing ElementNode */
  tag: string;
  attributes: Record<string, string>;
  styles: Record<string, string>;
  children: string[]; // UIDs of child components
  originalIndex: number;
  initiallyHidden: boolean;
  
  /** Enhanced serialization data */
  computedStyles: Record<string, string>;
  boundingRect: SerializedRect;
  semanticRole: string;
  accessibilityInfo: AccessibilityInfo;
  layoutContext?: LayoutContext;
}

export interface LayoutContext {
  /** Display properties */
  display: string;
  position: string;
  parentDisplay: string;
  
  /** Layout relationships */
  isGridChild: boolean;
  isFlexChild: boolean;
  isLayoutContainer: boolean;
  
  /** Semantic layout role */
  layoutRole: string;
  
  /** Grid/Flex specific properties */
  gridArea?: string | undefined;
  flexGrow?: string | undefined;
  flexShrink?: string | undefined;
  flexBasis?: string | undefined;
}

export interface VisualState {
  /** Current visibility and display state */
  isVisible: boolean;
  isHidden: boolean;
  opacity: number;
  
  /** Positioning and layout */
  position: SerializedPosition;
  dimensions: SerializedDimensions;
  
  /** Visual appearance */
  colors: ColorPalette;
  typography: TypographyInfo;
  effects: VisualEffects;
}

export interface ComponentRelationships {
  /** Hierarchical relationships */
  parent: string | null; // UID
  children: string[]; // UIDs
  siblings: string[]; // UIDs
  
  /** Layout relationships */
  layoutContainer: string | null; // UID of layout parent
  layoutChildren: string[]; // UIDs of layout children
  
  /** Semantic relationships */
  labelledBy: string | null; // UID
  describedBy: string | null; // UID
  controls: string[]; // UIDs
}

export interface InteractionCapabilities {
  /** Interactive states */
  isInteractive: boolean;
  isSelectable: boolean;
  isFocusable: boolean;
  
  /** Event capabilities */
  supportedEvents: string[];
  currentState: InteractionState;
  
  /** Customization capabilities */
  customizableProperties: CustomizableProperty[];
  constraints: PropertyConstraints;
}

// ─────────────────────────────────────────────
// Style Snapshot
// ─────────────────────────────────────────────

export interface StyleSnapshot {
  /** Global CSS rules */
  globalRules: CSSRuleSnapshot[];
  
  /** Component-specific styles */
  componentStyles: ComponentStyleMap;
  
  /** Theme and design tokens */
  designTokens: DesignTokens;
  
  /** Custom CSS */
  customCSS: string;
}

export interface CSSRuleSnapshot {
  /** CSS rule information */
  selector: string;
  properties: Record<string, string>;
  specificity: number;
  source: StyleSource;
  mediaQuery?: string;
}

export interface ComponentStyleMap {
  [uid: string]: {
    computed: Record<string, string>;
    inline: Record<string, string>;
    classes: string[];
    pseudoStates: Record<string, Record<string, string>>;
  };
}

export interface DesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  effects: EffectTokens;
}

// ─────────────────────────────────────────────
// Layout Structure
// ─────────────────────────────────────────────

export interface LayoutStructure {
  /** Layout algorithm detection */
  layoutType: LayoutType;
  
  /** Grid and flexbox information */
  containers: LayoutContainer[];
  
  /** Positioning relationships */
  positioningContext: PositioningContext[];
  
  /** Responsive breakpoints */
  breakpoints: ResponsiveBreakpoint[];
  
  /** Z-index stacking */
  stackingContext: StackingLayer[];
}

export interface LayoutContainer {
  uid: string;
  type: "flex" | "grid" | "block" | "inline" | "positioned";
  properties: LayoutProperties;
  children: LayoutChild[];
}

export interface LayoutChild {
  uid: string;
  order: number;
  constraints: LayoutConstraints;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  gridArea?: string;
}

// ─────────────────────────────────────────────
// Customization Layer
// ─────────────────────────────────────────────

export interface CustomizationLayer {
  /** Applied patches from existing system */
  patches: Patch[];
  
  /** User customization history */
  customizationHistory: CustomizationEntry[];
  
  /** Active customization context */
  activeContext: CustomizationContext;
  
  /** Customization metadata */
  customizationMetadata: CustomizationMetadata;
}

export interface CustomizationEntry {
  id: string;
  timestamp: number;
  type: "style" | "layout" | "content" | "interaction";
  target: string; // UID
  changes: CustomizationChange[];
  userIntent: string;
  aiGenerated: boolean;
}

export interface CustomizationChange {
  property: string;
  oldValue: string;
  newValue: string;
  confidence: number;
}

export interface CustomizationContext {
  activeSelection: string | null; // UID
  customizationMode: "visual" | "advanced" | "ai";
  availableActions: CustomizationAction[];
  constraints: ContextConstraints;
}

// ─────────────────────────────────────────────
// Snapshot Metadata
// ─────────────────────────────────────────────

export interface SnapshotMetadata {
  /** Basic info */
  timestamp: number;
  version: string;
  websiteId: string;
  userId: string;
  sessionId: string;
  
  /** Technical metadata */
  captureMethod: "full" | "incremental";
  browserInfo: BrowserInfo;
  viewportInfo: ViewportInfo;
  performanceMetrics: PerformanceMetrics;
  
  /** Content metadata */
  pageInfo: PageInfo;
  componentCounts: ComponentCounts;
  customizationSummary: CustomizationSummary;
}

// ─────────────────────────────────────────────
// Diff-Based Update Types
// ─────────────────────────────────────────────

export interface SnapshotDiff {
  /** Diff metadata */
  fromVersion: string;
  toVersion: string;
  timestamp: number;
  
  /** Component changes */
  components: ComponentDiff;
  
  /** Style changes */
  styles: StyleDiff;
  
  /** Layout changes */
  layout: LayoutDiff;
  
  /** Customization changes */
  customizations: CustomizationDiff;
}

export interface ComponentDiff {
  added: ComponentState[];
  modified: ComponentModification[];
  removed: string[]; // UIDs
  reordered: ReorderOperation[];
}

export interface ComponentModification {
  uid: string;
  changes: {
    element?: Partial<SerializedElementNode>;
    visualState?: Partial<VisualState>;
    relationships?: Partial<ComponentRelationships>;
    interactions?: Partial<InteractionCapabilities>;
  };
}

export interface StyleDiff {
  globalRules: {
    added: CSSRuleSnapshot[];
    modified: RuleModification[];
    removed: string[]; // selectors
  };
  componentStyles: {
    [uid: string]: ComponentStyleModification;
  };
  designTokens: Partial<DesignTokens>;
}

export interface LayoutDiff {
  containers: {
    added: LayoutContainer[];
    modified: ContainerModification[];
    removed: string[]; // UIDs
  };
  positioningChanges: PositioningChange[];
  responsiveChanges: ResponsiveChange[];
}

export interface CustomizationDiff {
  patches: {
    added: Patch[];
    removed: string[]; // patch IDs
  };
  historyEntries: {
    added: CustomizationEntry[];
  };
  contextChanges: Partial<CustomizationContext>;
}

// ─────────────────────────────────────────────
// Supporting Type Definitions
// ─────────────────────────────────────────────

export interface SerializedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SerializedPosition {
  x: number;
  y: number;
  z: number;
  type: "static" | "relative" | "absolute" | "fixed" | "sticky";
}

export interface SerializedDimensions {
  width: number;
  height: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export interface AccessibilityInfo {
  role: string;
  label: string;
  description: string;
  level?: number;
  expanded?: boolean;
  selected?: boolean;
  checked?: boolean;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  border: string;
  accent: string;
}

export interface TypographyInfo {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: string;
}

export interface VisualEffects {
  boxShadow: string;
  borderRadius: number;
  opacity: number;
  transform: string;
  filter: string;
}

export interface InteractionState {
  hover: boolean;
  focus: boolean;
  active: boolean;
  disabled: boolean;
  selected: boolean;
}

export interface CustomizableProperty {
  name: string;
  type: "color" | "number" | "string" | "boolean" | "enum";
  currentValue: unknown;
  possibleValues?: unknown[];
  constraints?: PropertyConstraints;
}

export interface PropertyConstraints {
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
}

// ─────────────────────────────────────────────
// Prompt Context
// ─────────────────────────────────────────────

export interface PromptContext {
  /** The user's prompt text */
  promptText: string;
  
  /** Type of prompt */
  promptType?: "ai_modification" | "ai_query" | "manual_change";
  
  /** Element that was selected when prompting */
  selectedElementUID?: string;
  
  /** Current page URL */
  pageUrl?: string;
  
  /** User agent string */
  userAgent?: string;
  
  /** How this snapshot was triggered */
  triggerType?: "manual" | "ai_prompt" | "auto_sync";
  
  /** Additional context metadata */
  metadata?: Record<string, unknown>;
}

export type LayoutType = "flow" | "flex" | "grid" | "positioned" | "table" | "multi-column";
export type StyleSource = "inline" | "internal" | "external" | "user-agent";

export interface LayoutProperties {
  display: string;
  flexDirection?: string;
  flexWrap?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  position?: string;
}

export interface LayoutConstraints {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatio?: number;
}

export interface PositioningContext {
  uid: string;
  type: "static" | "relative" | "absolute" | "fixed" | "sticky";
  zIndex: number;
  containingBlock: string | null; // UID
}

export interface ResponsiveBreakpoint {
  name: string;
  minWidth: number;
  maxWidth?: number;
  activeComponents: string[]; // UIDs
  hiddenComponents: string[]; // UIDs
}

export interface StackingLayer {
  zIndex: number;
  components: string[]; // UIDs
  context: string; // UID of stacking context root
}

export interface CustomizationAction {
  id: string;
  name: string;
  description: string;
  type: "style" | "layout" | "content";
  target: string; // UID
  applicable: boolean;
}

export interface ContextConstraints {
  readonly: boolean;
  maxChanges?: number;
  allowedProperties?: string[];
  forbiddenProperties?: string[];
}

export interface ColorTokens {
  [tokenName: string]: string;
}

export interface TypographyTokens {
  [tokenName: string]: TypographyInfo;
}

export interface SpacingTokens {
  [tokenName: string]: number;
}

export interface EffectTokens {
  [tokenName: string]: VisualEffects;
}

export interface ReorderOperation {
  parentUid: string;
  newOrder: string[]; // UIDs in new order
}

export interface RuleModification {
  selector: string;
  changes: {
    added?: Record<string, string>;
    modified?: Record<string, { old: string; new: string }>;
    removed?: string[];
  };
}

export interface ComponentStyleModification {
  computed?: Record<string, { old: string; new: string }>;
  inline?: Record<string, { old: string; new: string }>;
  classes?: {
    added?: string[];
    removed?: string[];
  };
}

export interface ContainerModification {
  uid: string;
  changes: Partial<LayoutContainer>;
}

export interface PositioningChange {
  uid: string;
  oldPosition: SerializedPosition;
  newPosition: SerializedPosition;
}

export interface ResponsiveChange {
  breakpoint: string;
  changes: {
    shown?: string[]; // UIDs
    hidden?: string[]; // UIDs
    modified?: ComponentModification[];
  };
}

export interface BrowserInfo {
  userAgent: string;
  vendor: string;
  version: string;
  platform: string;
}

export interface ViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  orientation: "portrait" | "landscape";
}

export interface PerformanceMetrics {
  captureTime: number;
  serializationTime: number;
  componentCount: number;
  totalSize: number;
}

export interface PageInfo {
  url: string;
  title: string;
  lang: string;
  charset: string;
  viewport: string;
}

export interface ComponentCounts {
  total: number;
  byType: Record<string, number>;
  interactive: number;
  customized: number;
}

export interface CustomizationSummary {
  totalChanges: number;
  byType: Record<string, number>;
  aiGenerated: number;
  userGenerated: number;
}

export interface CustomizationMetadata {
  created: number;
  lastModified: number;
  version: number;
  flags: string[];
  tags: string[];
}