// ─────────────────────────────────────────────
// Website Serialization Core
// ─────────────────────────────────────────────

import type {
  InterceptNode,
  ElementNode,
  TextNode,
  Patch,
  SelectedElement,
  InterceptConfig,
} from "../types/index";

import type {
  WebsiteSnapshot,
  ComponentState,
  SerializedElementNode,
  LayoutContext,
  VisualState,
  ComponentRelationships,
  InteractionCapabilities,
  StyleSnapshot,
  LayoutStructure,
  CustomizationLayer,
  SnapshotMetadata,
  SnapshotDiff,
  ComponentDiff,
  SerializedRect,
  SerializedPosition,
  SerializedDimensions,
  AccessibilityInfo,
  ColorPalette,
  TypographyInfo,
  VisualEffects,
  InteractionState,
  CustomizableProperty,
} from "../types/serialization";

import { generateUid } from "../utils/index";

// ─────────────────────────────────────────────
// Main Serialization Class
// ─────────────────────────────────────────────

export class WebsiteSerializer {
  private config: Required<Pick<InterceptConfig, "uidAttribute" | "descriptionAttribute">>;
  private lastSnapshot: WebsiteSnapshot | null = null;

  constructor(config: Pick<InterceptConfig, "uidAttribute" | "descriptionAttribute"> = {}) {
    this.config = {
      uidAttribute: config.uidAttribute ?? "data-uid",
      descriptionAttribute: config.descriptionAttribute ?? "data-description",
    };
  }

  /**
   * Creates a complete website snapshot from the current state
   */
  createSnapshot(
    interceptTree: InterceptNode,
    patches: Patch[],
    root: Element,
    websiteId: string,
    userId: string,
    sessionId: string,
    promptContext?: import('../types/serialization').PromptContext
  ): WebsiteSnapshot {
    const startTime = performance.now();

    // Serialize components
    const components = this.serializeComponents(interceptTree);

    // Serialize styles
    const styles = this.serializeStyles(components, root);

    // Serialize layout
    const layout = this.serializeLayout(components, root);

    // Serialize customizations
    const userCustomizations = this.serializeCustomizations(patches, components);

    // Create metadata
    const metadata = this.createMetadata(
      websiteId,
      userId,
      sessionId,
      components,
      startTime
    );

    const snapshot: WebsiteSnapshot = {
      components,
      styles,
      layout,
      userCustomizations,
      metadata,
      ...(promptContext && { promptContext }),
    };

    this.lastSnapshot = snapshot;
    return snapshot;
  }

  /**
   * Creates a diff between the current state and the last snapshot
   */
  createDiff(currentSnapshot: WebsiteSnapshot): SnapshotDiff | null {
    if (!this.lastSnapshot) {
      return null;
    }

    const diff: SnapshotDiff = {
      fromVersion: this.lastSnapshot.metadata.version,
      toVersion: currentSnapshot.metadata.version,
      timestamp: Date.now(),
      components: this.diffComponents(
        this.lastSnapshot.components,
        currentSnapshot.components
      ),
      styles: this.diffStyles(this.lastSnapshot.styles, currentSnapshot.styles),
      layout: this.diffLayout(this.lastSnapshot.layout, currentSnapshot.layout),
      customizations: this.diffCustomizations(
        this.lastSnapshot.userCustomizations,
        currentSnapshot.userCustomizations
      ),
    };

    return diff;
  }

  /**
   * Applies a diff to update the snapshot incrementally
   */
  applyDiff(baseSnapshot: WebsiteSnapshot, diff: SnapshotDiff): WebsiteSnapshot {
    const updatedSnapshot = structuredClone(baseSnapshot);

    // Apply component changes
    this.applyComponentDiff(updatedSnapshot.components, diff.components);

    // Apply style changes
    this.applyStyleDiff(updatedSnapshot.styles, diff.styles);

    // Apply layout changes
    this.applyLayoutDiff(updatedSnapshot.layout, diff.layout);

    // Apply customization changes
    this.applyCustomizationDiff(
      updatedSnapshot.userCustomizations,
      diff.customizations
    );

    // Update metadata
    updatedSnapshot.metadata.version = diff.toVersion;
    updatedSnapshot.metadata.timestamp = diff.timestamp;

    return updatedSnapshot;
  }

  // ─────────────────────────────────────────────
  // Component Serialization
  // ─────────────────────────────────────────────

  private serializeComponents(node: InterceptNode): ComponentState[] {
    const components: ComponentState[] = [];
    const componentMap = new Map<string, ComponentState>();

    // First pass: create all components
    this.walkTree(node, (currentNode) => {
      if (currentNode.nodeType === "element") {
        const component = this.serializeComponent(currentNode as ElementNode);
        components.push(component);
        componentMap.set(component.uid, component);
      }
    });

    // Second pass: populate relationships
    this.populateRelationships(components, componentMap);

    return components;
  }

  private serializeComponent(element: ElementNode): ComponentState {
    const domElement = element.domRef;

    return {
      uid: element.uid,
      element: this.serializeElementNode(element),
      visualState: domElement instanceof Element ? this.captureVisualState(domElement) : this.createEmptyVisualState(),
      relationships: this.createEmptyRelationships(),
      interactions: domElement instanceof Element ? this.captureInteractionCapabilities(domElement) : this.createEmptyInteractionCapabilities(),
    };
  }

  private serializeElementNode(element: ElementNode): SerializedElementNode {
    const domElement = element.domRef;

    return {
      tag: element.tag,
      attributes: { ...element.attributes },
      styles: { ...element.styles },
      children: element.children.map((child) => child.uid),
      originalIndex: element.originalIndex,
      initiallyHidden: element.initiallyHidden,
      computedStyles: domElement instanceof Element ? this.captureComputedStyles(domElement) : {},
      boundingRect: domElement instanceof Element ? this.captureBoundingRect(domElement) : this.createEmptyBoundingRect(),
      semanticRole: domElement instanceof Element ? this.detectSemanticRole(domElement) : '',
      accessibilityInfo: domElement instanceof Element ? this.captureAccessibilityInfo(domElement) : this.createEmptyAccessibilityInfo(),
      ...(domElement instanceof Element && { layoutContext: this.captureLayoutContext(domElement, element) }),
    };
  }

  private captureVisualState(element: Element): VisualState {
    const computedStyle = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return {
      isVisible: this.isElementVisible(element, computedStyle),
      isHidden: element.hasAttribute("hidden") || computedStyle.display === "none",
      opacity: parseFloat(computedStyle.opacity),
      position: this.capturePosition(element, computedStyle),
      dimensions: this.captureDimensions(rect, computedStyle),
      colors: this.captureColorPalette(computedStyle),
      typography: this.captureTypography(computedStyle),
      effects: this.captureVisualEffects(computedStyle),
    };
  }

  private captureInteractionCapabilities(element: Element): InteractionCapabilities {
    const tag = element.tagName.toLowerCase();
    const computedStyle = window.getComputedStyle(element);

    const interactiveElements = new Set([
      "a", "button", "input", "textarea", "select", "option",
      "details", "summary", "area", "audio", "video"
    ]);

    const isInteractive = 
      interactiveElements.has(tag) ||
      element.hasAttribute("tabindex") ||
      element.hasAttribute("onclick") ||
      computedStyle.cursor === "pointer";

    return {
      isInteractive,
      isSelectable: this.isSelectable(element, computedStyle),
      isFocusable: this.isFocusable(element),
      supportedEvents: this.getSupportedEvents(element, tag),
      currentState: this.captureInteractionState(element),
      customizableProperties: this.getCustomizableProperties(element, computedStyle),
      constraints: {
        readonly: element.hasAttribute("readonly"),
      },
    };
  }

  // ─────────────────────────────────────────────
  // Style Serialization
  // ─────────────────────────────────────────────

  private serializeStyles(components: ComponentState[], root: Element): StyleSnapshot {
    return {
      globalRules: this.captureGlobalRules(),
      componentStyles: this.captureComponentStyles(components),
      designTokens: this.extractDesignTokens(),
      customCSS: this.extractCustomCSS(),
    };
  }

  private captureGlobalRules() {
    const rules: any[] = [];
    
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          if (sheet.cssRules) {
            for (const rule of Array.from(sheet.cssRules)) {
              if (rule instanceof CSSStyleRule) {
                rules.push({
                  selector: rule.selectorText,
                  properties: this.parseRuleProperties(rule.style),
                  specificity: this.calculateSpecificity(rule.selectorText),
                  source: this.determineStyleSource(sheet),
                  mediaQuery: this.getMediaQuery(rule),
                });
              }
            }
          }
        } catch (e) {
          // Cross-origin stylesheet access blocked
          console.warn("Cannot access stylesheet rules:", e);
        }
      }
    } catch (e) {
      console.warn("Error capturing global CSS rules:", e);
    }

    return rules;
  }

  private captureComponentStyles(components: ComponentState[]) {
    const componentStyles: any = {};

    for (const component of components) {
      const element = document.querySelector(`[${this.config.uidAttribute}="${component.uid}"]`) as Element;
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        const htmlElement = element as HTMLElement;

        componentStyles[component.uid] = {
          computed: this.captureComputedStyles(element),
          inline: component.element.styles,
          classes: Array.from(element.classList),
          pseudoStates: this.capturePseudoStates(element),
        };
      }
    }

    return componentStyles;
  }

  // ─────────────────────────────────────────────
  // Layout Serialization
  // ─────────────────────────────────────────────

  private serializeLayout(components: ComponentState[], root: Element): LayoutStructure {
    const containers = this.detectLayoutContainers(components);
    
    return {
      layoutType: this.detectMainLayoutType(root),
      containers,
      positioningContext: this.capturePositioningContext(components),
      breakpoints: this.detectResponsiveBreakpoints(),
      stackingContext: this.captureStackingContext(components),
    };
  }

  private detectLayoutContainers(components: ComponentState[]) {
    return components
      .filter(component => this.isLayoutContainer(component))
      .map(component => {
        const element = document.querySelector(`[${this.config.uidAttribute}="${component.uid}"]`) as Element;
        const computedStyle = window.getComputedStyle(element);
        
        return {
          uid: component.uid,
          type: this.detectContainerType(computedStyle) as any,
          properties: this.captureLayoutProperties(computedStyle),
          children: component.element.children.map(childUid => ({
            uid: childUid,
            order: 0, // Will be populated separately
            constraints: {},
          })),
        };
      });
  }

  // ─────────────────────────────────────────────
  // Customization Serialization
  // ─────────────────────────────────────────────

  private serializeCustomizations(
    patches: Patch[],
    components: ComponentState[]
  ): CustomizationLayer {
    return {
      patches: [...patches],
      customizationHistory: this.createCustomizationHistory(patches),
      activeContext: this.createActiveContext(components),
      customizationMetadata: this.createCustomizationMetadata(patches),
    };
  }

  private createCustomizationHistory(patches: Patch[]) {
    return patches.map(patch => ({
      id: patch.id,
      timestamp: patch.timestamp,
      type: this.mapPatchToCustomizationType(patch.op),
      target: patch.target,
      changes: this.extractChangesFromPatch(patch),
      userIntent: "",
      aiGenerated: patch.source === "ai",
    }));
  }

  // ─────────────────────────────────────────────
  // Diff Operations
  // ─────────────────────────────────────────────

  private diffComponents(oldComponents: ComponentState[], newComponents: ComponentState[]): ComponentDiff {
    const oldMap = new Map(oldComponents.map(c => [c.uid, c]));
    const newMap = new Map(newComponents.map(c => [c.uid, c]));

    const added = newComponents.filter(c => !oldMap.has(c.uid));
    const removed = oldComponents.filter(c => !newMap.has(c.uid)).map(c => c.uid);
    const modified = [];

    for (const newComponent of newComponents) {
      const oldComponent = oldMap.get(newComponent.uid);
      if (oldComponent) {
        const changes = this.detectComponentChanges(oldComponent, newComponent);
        if (Object.keys(changes).length > 0) {
          modified.push({
            uid: newComponent.uid,
            changes,
          });
        }
      }
    }

    return {
      added,
      modified,
      removed,
      reordered: [], // Will be implemented based on specific needs
    };
  }

  private diffStyles(oldStyles: StyleSnapshot, newStyles: StyleSnapshot) {
    return {
      globalRules: {
        added: [],
        modified: [],
        removed: [],
      },
      componentStyles: {},
      designTokens: {},
    };
  }

  private diffLayout(oldLayout: LayoutStructure, newLayout: LayoutStructure) {
    return {
      containers: {
        added: [],
        modified: [],
        removed: [],
      },
      positioningChanges: [],
      responsiveChanges: [],
    };
  }

  private diffCustomizations(
    oldCustomizations: CustomizationLayer,
    newCustomizations: CustomizationLayer
  ) {
    const oldPatches = new Set(oldCustomizations.patches.map(p => p.id));
    const newPatches = newCustomizations.patches;

    return {
      patches: {
        added: newPatches.filter(p => !oldPatches.has(p.id)),
        removed: [],
      },
      historyEntries: {
        added: [],
      },
      contextChanges: {},
    };
  }

  // ─────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────

  private walkTree(node: InterceptNode, callback: (node: InterceptNode) => void) {
    callback(node);
    if (node.nodeType === "element") {
      for (const child of (node as ElementNode).children) {
        this.walkTree(child, callback);
      }
    }
  }

  private isElementVisible(element: Element, computedStyle: CSSStyleDeclaration): boolean {
    return (
      computedStyle.display !== "none" &&
      computedStyle.visibility !== "hidden" &&
      parseFloat(computedStyle.opacity) > 0 &&
      !element.hasAttribute("hidden")
    );
  }

  private captureBoundingRect(element: Element): SerializedRect {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    };
  }

  private capturePosition(element: Element, computedStyle: CSSStyleDeclaration): SerializedPosition {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      z: parseInt(computedStyle.zIndex) || 0,
      type: computedStyle.position as any,
    };
  }

  private captureDimensions(rect: DOMRect, computedStyle: CSSStyleDeclaration): SerializedDimensions {
    const minWidth = this.parsePixelValue(computedStyle.minWidth);
    const maxWidth = this.parsePixelValue(computedStyle.maxWidth);
    const minHeight = this.parsePixelValue(computedStyle.minHeight);
    const maxHeight = this.parsePixelValue(computedStyle.maxHeight);

    const result: SerializedDimensions = {
      width: rect.width,
      height: rect.height,
    };

    if (minWidth !== undefined) result.minWidth = minWidth;
    if (maxWidth !== undefined) result.maxWidth = maxWidth;
    if (minHeight !== undefined) result.minHeight = minHeight;
    if (maxHeight !== undefined) result.maxHeight = maxHeight;

    return result;
  }

  private captureColorPalette(computedStyle: CSSStyleDeclaration): ColorPalette {
    return {
      primary: computedStyle.color,
      secondary: "",
      background: computedStyle.backgroundColor,
      text: computedStyle.color,
      border: computedStyle.borderColor,
      accent: "",
    };
  }

  private captureTypography(computedStyle: CSSStyleDeclaration): TypographyInfo {
    return {
      fontFamily: computedStyle.fontFamily,
      fontSize: this.parsePixelValue(computedStyle.fontSize) || 16,
      fontWeight: parseInt(computedStyle.fontWeight) || 400,
      lineHeight: this.parsePixelValue(computedStyle.lineHeight) || 1.2,
      letterSpacing: this.parsePixelValue(computedStyle.letterSpacing) || 0,
      textAlign: computedStyle.textAlign,
    };
  }

  private captureVisualEffects(computedStyle: CSSStyleDeclaration): VisualEffects {
    return {
      boxShadow: computedStyle.boxShadow,
      borderRadius: this.parsePixelValue(computedStyle.borderRadius) || 0,
      opacity: parseFloat(computedStyle.opacity),
      transform: computedStyle.transform,
      filter: computedStyle.filter,
    };
  }

  private createMetadata(
    websiteId: string,
    userId: string,
    sessionId: string,
    components: ComponentState[],
    startTime: number
  ): SnapshotMetadata {
    const endTime = performance.now();
    
    return {
      timestamp: Date.now(),
      version: generateUid(),
      websiteId,
      userId,
      sessionId,
      captureMethod: "full",
      browserInfo: {
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        version: "",
        platform: navigator.platform,
      },
      viewportInfo: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        orientation: window.innerWidth > window.innerHeight ? "landscape" : "portrait",
      },
      performanceMetrics: {
        captureTime: endTime - startTime,
        serializationTime: 0,
        componentCount: components.length,
        totalSize: 0,
      },
      pageInfo: {
        url: window.location.href,
        title: document.title,
        lang: document.documentElement.lang || "en",
        charset: document.characterSet,
        viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "",
      },
      componentCounts: {
        total: components.length,
        byType: {},
        interactive: components.filter(c => c.interactions.isInteractive).length,
        customized: 0,
      },
      customizationSummary: {
        totalChanges: 0,
        byType: {},
        aiGenerated: 0,
        userGenerated: 0,
      },
    };
  }

  // Additional helper methods would be implemented here...
  private parsePixelValue(value: string): number | undefined {
    const match = value.match(/^(\d+(?:\.\d+)?)px$/);
    return match && match[1] ? parseFloat(match[1]) : undefined;
  }

  private captureComputedStyles(element: Element): Record<string, string> {
    const computedStyle = window.getComputedStyle(element);
    const importantStyles = [
      "display", "position", "width", "height", "margin", "padding",
      "color", "backgroundColor", "fontSize", "fontFamily", "border",
      "borderRadius", "boxShadow", "transform", "opacity", "zIndex"
    ];

    const styles: Record<string, string> = {};
    for (const prop of importantStyles) {
      styles[prop] = computedStyle.getPropertyValue(prop);
    }
    return styles;
  }

  private detectSemanticRole(element: Element): string {
    return element.getAttribute("role") || element.tagName.toLowerCase();
  }

  private captureAccessibilityInfo(element: Element): AccessibilityInfo {
    const ariaLevel = element.getAttribute("aria-level");
    const result: AccessibilityInfo = {
      role: this.detectSemanticRole(element),
      label: element.getAttribute("aria-label") || element.getAttribute("title") || "",
      description: element.getAttribute("aria-description") || "",
      expanded: element.getAttribute("aria-expanded") === "true",
      selected: element.getAttribute("aria-selected") === "true",
      checked: element.getAttribute("aria-checked") === "true",
    };

    if (ariaLevel) {
      const level = parseInt(ariaLevel);
      if (!isNaN(level)) {
        result.level = level;
      }
    }

    return result;
  }

  private createEmptyRelationships(): ComponentRelationships {
    return {
      parent: null,
      children: [],
      siblings: [],
      layoutContainer: null,
      layoutChildren: [],
      labelledBy: null,
      describedBy: null,
      controls: [],
    };
  }

  private populateRelationships(components: ComponentState[], componentMap: Map<string, ComponentState>) {
    // Implementation would populate parent-child relationships, etc.
  }

  private isSelectable(element: Element, computedStyle: CSSStyleDeclaration): boolean {
    return computedStyle.userSelect !== "none" && !element.hasAttribute("unselectable");
  }

  private isFocusable(element: Element): boolean {
    const tabIndex = element.getAttribute("tabindex");
    return tabIndex !== null && tabIndex !== "-1" || this.isNativelyFocusable(element);
  }

  private isNativelyFocusable(element: Element): boolean {
    const focusableElements = new Set([
      "a", "button", "input", "textarea", "select", "area", "iframe", "object", "embed"
    ]);
    return focusableElements.has(element.tagName.toLowerCase()) && !element.hasAttribute("disabled");
  }

  private getSupportedEvents(element: Element, tag: string): string[] {
    const baseEvents = ["click", "mouseenter", "mouseleave"];
    const inputEvents = ["input", "change", "focus", "blur"];
    
    const inputTags = new Set(["input", "textarea", "select"]);
    return inputTags.has(tag) ? [...baseEvents, ...inputEvents] : baseEvents;
  }

  private captureInteractionState(element: Element): InteractionState {
    return {
      hover: false, // Would need to track this separately
      focus: document.activeElement === element,
      active: false, // Would need to track this separately
      disabled: element.hasAttribute("disabled"),
      selected: element.hasAttribute("aria-selected") && element.getAttribute("aria-selected") === "true",
    };
  }

  private getCustomizableProperties(element: Element, computedStyle: CSSStyleDeclaration): CustomizableProperty[] {
    const properties: CustomizableProperty[] = [
      {
        name: "color",
        type: "color",
        currentValue: computedStyle.color,
      },
      {
        name: "backgroundColor", 
        type: "color",
        currentValue: computedStyle.backgroundColor,
      },
      {
        name: "fontSize",
        type: "number",
        currentValue: this.parsePixelValue(computedStyle.fontSize),
        constraints: { min: 8, max: 72 },
      },
      {
        name: "borderRadius",
        type: "number", 
        currentValue: this.parsePixelValue(computedStyle.borderRadius),
        constraints: { min: 0, max: 50 },
      },
    ];

    return properties;
  }

  // More helper methods for diff operations, layout detection, etc.
  private applyComponentDiff(components: ComponentState[], diff: ComponentDiff) {
    // Implementation for applying component diffs
  }

  private applyStyleDiff(styles: StyleSnapshot, diff: any) {
    // Implementation for applying style diffs  
  }

  private applyLayoutDiff(layout: LayoutStructure, diff: any) {
    // Implementation for applying layout diffs
  }

  private applyCustomizationDiff(customizations: CustomizationLayer, diff: any) {
    // Implementation for applying customization diffs
  }

  private detectComponentChanges(oldComponent: ComponentState, newComponent: ComponentState) {
    const changes: any = {};
    // Deep comparison logic here
    return changes;
  }


  private extractDesignTokens() {
    return {
      colors: {},
      typography: {},
      spacing: {},
      effects: {},
    };
  }

  private extractCustomCSS(): string {
    return "";
  }

  private createEmptyVisualState(): VisualState {
    return {
      isVisible: false,
      isHidden: false,
      opacity: 1,
      position: {
        x: 0,
        y: 0,
        z: 0,
        type: 'static'
      },
      dimensions: {
        width: 0,
        height: 0,
      },
      colors: {
        primary: '',
        secondary: '',
        background: '',
        text: '',
        border: '',
        accent: '',
      },
      typography: {
        fontFamily: '',
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.2,
        letterSpacing: 0,
        textAlign: 'left',
      },
      effects: {
        boxShadow: '',
        borderRadius: 0,
        opacity: 1,
        transform: 'none',
        filter: 'none',
      },
    };
  }

  private createEmptyInteractionCapabilities(): InteractionCapabilities {
    return {
      isInteractive: false,
      isSelectable: false,
      isFocusable: false,
      supportedEvents: [],
      currentState: {
        hover: false,
        focus: false,
        active: false,
        disabled: false,
        selected: false,
      },
      customizableProperties: [],
      constraints: {
        disabled: false,
        required: false,
        pattern: '',
        minLength: 0,
        maxLength: 0,
        min: 0,
        max: 0,
        step: 1,
      },
    };
  }

  private createEmptyBoundingRect(): SerializedRect {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
  }

  private createEmptyAccessibilityInfo(): AccessibilityInfo {
    return {
      role: '',
      label: '',
      description: '',
      level: 0,
      expanded: false,
      selected: false,
      checked: false,
    };
  }

  private parseRuleProperties(style: CSSStyleDeclaration): Record<string, string> {
    const props: Record<string, string> = {};
    for (let i = 0; i < style.length; i++) {
      const prop = style.item(i);
      if (prop) {
        props[prop] = style.getPropertyValue(prop);
      }
    }
    return props;
  }

  private calculateSpecificity(selector: string): number {
    // Simple specificity calculation - would be more sophisticated in practice
    return selector.split(' ').length;
  }

  private determineStyleSource(sheet: CSSStyleSheet): "inline" | "internal" | "external" | "user-agent" {
    if (!sheet.href) return "internal";
    if (sheet.href.startsWith(window.location.origin)) return "internal";
    return "external";
  }

  private getMediaQuery(rule: CSSRule): string | undefined {
    return undefined; // Would extract media query if rule is part of @media
  }

  private capturePseudoStates(element: Element) {
    return {}; // Would capture :hover, :focus, etc. states
  }

  private detectMainLayoutType(root: Element): "flow" | "flex" | "grid" | "positioned" | "table" | "multi-column" {
    const computedStyle = window.getComputedStyle(root);
    return computedStyle.display as any || "flow";
  }

  private isLayoutContainer(component: ComponentState): boolean {
    const layoutDisplays = new Set(["flex", "grid", "table"]);
    return Object.values(component.element.styles).some(value => 
      layoutDisplays.has(value) || value.includes("flex") || value.includes("grid")
    );
  }

  private detectContainerType(computedStyle: CSSStyleDeclaration) {
    if (computedStyle.display.includes("flex")) return "flex";
    if (computedStyle.display.includes("grid")) return "grid";
    if (computedStyle.position !== "static") return "positioned";
    return "block";
  }

  private captureLayoutProperties(computedStyle: CSSStyleDeclaration) {
    return {
      display: computedStyle.display,
      flexDirection: computedStyle.flexDirection,
      flexWrap: computedStyle.flexWrap,
      justifyContent: computedStyle.justifyContent,
      alignItems: computedStyle.alignItems,
      gap: computedStyle.gap,
      gridTemplateColumns: computedStyle.gridTemplateColumns,
      gridTemplateRows: computedStyle.gridTemplateRows,
      position: computedStyle.position,
    };
  }

  private capturePositioningContext(components: ComponentState[]) {
    return []; // Would analyze positioning contexts
  }

  private detectResponsiveBreakpoints() {
    return []; // Would analyze media queries and responsive behavior
  }

  private captureStackingContext(components: ComponentState[]) {
    return []; // Would analyze z-index stacking
  }

  private createActiveContext(components: ComponentState[]) {
    return {
      activeSelection: null,
      customizationMode: "visual" as const,
      availableActions: [],
      constraints: {
        readonly: false,
      },
    };
  }

  private createCustomizationMetadata(patches: Patch[]) {
    const now = Date.now();
    return {
      created: now,
      lastModified: now,
      version: 1,
      flags: [],
      tags: [],
    };
  }

  private mapPatchToCustomizationType(op: string): "style" | "layout" | "content" | "interaction" {
    switch (op) {
      case "restyle":
      case "addClass":
      case "removeClass":
        return "style";
      case "move":
      case "reorder":
        return "layout";
      case "setText":
        return "content";
      default:
        return "interaction";
    }
  }

  private extractChangesFromPatch(patch: Patch) {
    return []; // Would extract specific changes based on patch type
  }

  /**
   * Captures layout context that helps understand element relationships
   * and layout dependencies for safer patch operations
   */
  private captureLayoutContext(domElement: Element, element: ElementNode) {
    const computedStyle = window.getComputedStyle(domElement);
    const parent = domElement.parentElement;
    const parentComputedStyle = parent ? window.getComputedStyle(parent) : null;

    const context = {
      display: computedStyle.display,
      position: computedStyle.position,
      parentDisplay: parentComputedStyle?.display || "block",
      isGridChild: parentComputedStyle?.display.includes("grid") || false,
      isFlexChild: parentComputedStyle?.display.includes("flex") || false,
      isLayoutContainer: this.isElementLayoutContainer(computedStyle),
      layoutRole: this.detectLayoutRole(domElement, computedStyle),
      gridArea: computedStyle.gridArea !== "auto" ? computedStyle.gridArea : undefined,
      flexGrow: computedStyle.flexGrow !== "0" ? computedStyle.flexGrow : undefined,
      flexShrink: computedStyle.flexShrink !== "1" ? computedStyle.flexShrink : undefined,
      flexBasis: computedStyle.flexBasis !== "auto" ? computedStyle.flexBasis : undefined,
    };

    // Debug log for sidebar specifically
    if (context.layoutRole === "sidebar" || element.attributes.id === "sidebar") {
      console.log("[🎯 Layout Context] Sidebar detected:", element.uid, context);
    }

    return context;
  }

  private isElementLayoutContainer(computedStyle: CSSStyleDeclaration): boolean {
    const containerDisplays = ["grid", "flex", "table", "table-row", "table-cell"];
    return containerDisplays.some(display => computedStyle.display.includes(display));
  }

  private detectLayoutRole(element: Element, computedStyle: CSSStyleDeclaration): string {
    const classes = (element.className || "").toString().toLowerCase();
    
    // Common layout roles based on class names and semantic meaning
    if (classes.includes("sidebar") || classes.includes("aside")) return "sidebar";
    if (classes.includes("navbar") || classes.includes("header")) return "navbar";
    if (classes.includes("footer")) return "footer";
    if (classes.includes("main") || classes.includes("content")) return "main-content";
    if (classes.includes("container") || classes.includes("wrapper")) return "container";
    if (classes.includes("grid") && computedStyle.display.includes("grid")) return "grid-container";
    if (classes.includes("flex") && computedStyle.display.includes("flex")) return "flex-container";
    
    // Semantic HTML roles
    const tagName = element.tagName.toLowerCase();
    if (tagName === "aside") return "sidebar";
    if (tagName === "nav") return "navbar";
    if (tagName === "header") return "header";
    if (tagName === "footer") return "footer";
    if (tagName === "main") return "main-content";
    
    return "unknown";
  }
}

// ─────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────

export function createWebsiteSerializer(
  config?: Pick<InterceptConfig, "uidAttribute" | "descriptionAttribute">
): WebsiteSerializer {
  return new WebsiteSerializer(config);
}