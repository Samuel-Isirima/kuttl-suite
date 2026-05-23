import type { InterceptNode, ElementNode, Patch, PatchSource } from "../types/index";
import { buildUidIndex } from "../utils/index";

export interface LayoutContext {
  safe: boolean;
  parentDisplay: string;
  needsParentPatch: boolean;
  suggestedFixes: Patch[];
  warnings: string[];
  isLayoutContainer: boolean;
  childrenUids: string[];
  affectedElements: string[];
}

export interface LayoutImpactAnalysis {
  canApplySafely: boolean;
  requiredAdditionalPatches: Patch[];
  warnings: string[];
  previewDescription?: string;
}

export class LayoutAnalyzer {
  /**
   * Analyzes the layout impact of applying a patch to understand
   * what additional changes might be needed to prevent breaking the layout
   */
  analyzeLayoutImpact(
    tree: InterceptNode,
    patch: Patch,
    domRoot?: Element
  ): LayoutImpactAnalysis {
    const index = buildUidIndex(tree);
    const target = index.get(patch.target);

    if (!target || target.nodeType !== "element") {
      return {
        canApplySafely: true,
        requiredAdditionalPatches: [],
        warnings: [],
      };
    }

    const targetElement = target as ElementNode;
    const context = this.analyzeLayoutContext(tree, targetElement, index, domRoot);

    switch (patch.op) {
      case "hide":
        return this.analyzeHideOperation(targetElement, context, index, tree);
      case "show":
        return this.analyzeShowOperation(targetElement, context, index);
      case "move":
        return this.analyzeMoveOperation(targetElement, patch, context, index);
      case "restyle":
        return this.analyzeRestyleOperation(targetElement, patch, context, index);
      default:
        return {
          canApplySafely: true,
          requiredAdditionalPatches: [],
          warnings: [],
        };
    }
  }

  /**
   * Captures layout context for an element
   */
  private analyzeLayoutContext(
    tree: InterceptNode,
    target: ElementNode,
    index: Map<string, InterceptNode>,
    domRoot?: Element
  ): LayoutContext {
    const parent = this.findParent(tree, target.uid, index);
    
    // Get DOM element for runtime style analysis if available
    const domElement = domRoot?.querySelector(`[data-uid="${target.uid}"]`) || null;
    const parentDomElement = parent && domRoot ? domRoot.querySelector(`[data-uid="${parent.uid}"]`) || null : null;

    const parentDisplay = this.getDisplayValue(parent, parentDomElement);
    const targetDisplay = this.getDisplayValue(target, domElement);

    const isGridChild = parentDisplay.includes("grid");
    const isFlexChild = parentDisplay.includes("flex");
    const isLayoutContainer = this.isLayoutContainer(targetDisplay);

    return {
      safe: !isGridChild && !isFlexChild && !isLayoutContainer,
      parentDisplay,
      needsParentPatch: isGridChild || isFlexChild,
      suggestedFixes: [],
      warnings: [],
      isLayoutContainer,
      childrenUids: target.children.map(child => child.uid),
      affectedElements: isLayoutContainer ? target.children.map(child => child.uid) : [],
    };
  }

  /**
   * Analyzes the impact of hiding an element
   */
  private analyzeHideOperation(
    target: ElementNode,
    context: LayoutContext,
    index: Map<string, InterceptNode>,
    tree: InterceptNode
  ): LayoutImpactAnalysis {
    const additionalPatches: Patch[] = [];
    const warnings: string[] = [];

    // If hiding a grid child, we need to adjust the parent's grid
    console.log("[🔍 Layout Analyzer] Checking grid context:", {
      parentDisplay: context.parentDisplay,
      includesGrid: context.parentDisplay.includes("grid"),
      targetUid: target.uid
    });
    
    if (context.parentDisplay.includes("grid")) {
      const parent = this.findParent(tree, target.uid, index);
      console.log("[🔍 Layout Analyzer] Found parent:", parent ? parent.uid : "null");
      if (parent) {
        // Suggest removing the grid column/row for this element
        additionalPatches.push({
          id: `layout-fix-${Date.now()}`,
          target: parent.uid,
          timestamp: Date.now(),
          source: "ai" as PatchSource,
          op: "restyle",
          payload: {
            styles: {
              // Expand remaining content to full width after hiding sidebar
              gridTemplateColumns: "1fr", // Remove sidebar column, expand main content
            }
          }
        });
        warnings.push("Hiding this element will create a gap in the grid layout. Consider adjusting the parent container.");
      }
    }

    // If hiding a layout container, warn about orphaned children
    if (context.isLayoutContainer && context.childrenUids.length > 0) {
      warnings.push(`Hiding this container will hide ${context.childrenUids.length} child elements. Consider moving children to another container.`);
    }

    // If hiding a flex child in a flex container, usually safe (auto-collapses)
    if (context.parentDisplay.includes("flex")) {
      // Flex containers handle hidden children gracefully
      warnings.push("Element will be removed from flex layout flow.");
    }

    return {
      canApplySafely: context.safe || context.parentDisplay.includes("flex"),
      requiredAdditionalPatches: additionalPatches,
      warnings,
      previewDescription: `Hide element${additionalPatches.length > 0 ? " and adjust layout" : ""}`
    };
  }

  /**
   * Analyzes the impact of showing an element
   */
  private analyzeShowOperation(
    target: ElementNode,
    context: LayoutContext,
    index: Map<string, InterceptNode>
  ): LayoutImpactAnalysis {
    const warnings: string[] = [];

    // If showing in a grid, might need to restore grid structure
    if (context.parentDisplay.includes("grid")) {
      warnings.push("Showing this element may require adjusting the grid layout to accommodate it.");
    }

    return {
      canApplySafely: true,
      requiredAdditionalPatches: [],
      warnings,
      previewDescription: "Show element"
    };
  }

  /**
   * Analyzes the impact of moving an element
   */
  private analyzeMoveOperation(
    target: ElementNode,
    patch: Patch,
    context: LayoutContext,
    index: Map<string, InterceptNode>
  ): LayoutImpactAnalysis {
    const warnings: string[] = [];
    const additionalPatches: Patch[] = [];

    // Moving from/to different layout containers may require style adjustments
    if (context.parentDisplay.includes("grid") || context.parentDisplay.includes("flex")) {
      warnings.push("Moving element from a layout container may require style adjustments.");
    }

    return {
      canApplySafely: true,
      requiredAdditionalPatches: additionalPatches,
      warnings,
      previewDescription: "Move element to new container"
    };
  }

  /**
   * Analyzes the impact of restyling an element
   */
  private analyzeRestyleOperation(
    target: ElementNode,
    patch: Patch,
    context: LayoutContext,
    index: Map<string, InterceptNode>
  ): LayoutImpactAnalysis {
    const warnings: string[] = [];
    
    // Check if restyle changes layout-affecting properties
    const payload = (patch as any).payload;
    if (payload?.styles) {
      const layoutAffectingProps = ['display', 'position', 'width', 'height', 'margin', 'padding'];
      const changesLayout = Object.keys(payload.styles).some(prop => 
        layoutAffectingProps.includes(prop)
      );
      
      if (changesLayout) {
        warnings.push("This style change may affect the layout of surrounding elements.");
      }
    }

    return {
      canApplySafely: true,
      requiredAdditionalPatches: [],
      warnings,
      previewDescription: "Apply style changes"
    };
  }

  /**
   * Generates compound patches for common layout operations
   */
  generateCompoundPatch(operation: string, targetUid: string, context: LayoutContext): Patch[] {
    const timestamp = Date.now();
    const patches: Patch[] = [];

    switch (operation) {
      case "removeSidebar":
        // Hide the sidebar
        patches.push({
          id: `remove-sidebar-${timestamp}`,
          target: targetUid,
          timestamp,
          source: "ai" as PatchSource,
          op: "hide",
          payload: {}
        });

        // If parent is a grid, adjust grid template columns
        if (context.parentDisplay.includes("grid")) {
          const parentUid = this.getParentUid(targetUid);
          if (parentUid) {
            patches.push({
              id: `expand-main-${timestamp}`,
              target: parentUid,
              timestamp,
              source: "ai" as PatchSource, 
              op: "restyle",
              payload: {
                styles: {
                  gridTemplateColumns: "1fr" // Expand remaining content to full width
                }
              }
            });
          }
        }
        break;

      case "hideNavbar":
        // Hide the navbar
        patches.push({
          id: `hide-navbar-${timestamp}`,
          target: targetUid,
          timestamp,
          source: "ai" as PatchSource,
          op: "hide",
          payload: {}
        });

        // Adjust main content top spacing
        if (context.affectedElements.length > 0 && context.affectedElements[0]) {
          patches.push({
            id: `adjust-main-spacing-${timestamp}`,
            target: context.affectedElements[0], // Assuming first affected element is main content
            timestamp,
            source: "ai" as PatchSource,
            op: "restyle",
            payload: {
              styles: {
                paddingTop: "0"
              }
            }
          });
        }
        break;
    }

    return patches;
  }

  // Helper methods
  private findParent(
    tree: InterceptNode,
    targetUid: string,
    index: Map<string, InterceptNode>
  ): ElementNode | null {
    for (const node of index.values()) {
      if (node.nodeType === "element") {
        const elementNode = node as ElementNode;
        if (elementNode.children.some(child => child.uid === targetUid)) {
          return elementNode;
        }
      }
    }
    return null;
  }

  private getDisplayValue(element: ElementNode | null, domElement: Element | null): string {
    // First try to get from DOM computed styles
    if (domElement) {
      return window.getComputedStyle(domElement).display;
    }
    
    // Fall back to element styles
    if (element?.styles?.display) {
      return element.styles.display;
    }
    
    // Default
    return "block";
  }

  private isLayoutContainer(display: string): boolean {
    return display.includes("grid") || 
           display.includes("flex") || 
           display.includes("table");
  }

  private getParentUid(targetUid: string): string | null {
    // This would need to be implemented based on the tree structure
    // For now returning null, but should traverse up to find parent
    return null;
  }
}

/**
 * Detects common layout patterns and provides semantic operations
 */
export class LayoutPatternDetector {
  detectLayoutPattern(element: ElementNode, context: LayoutContext): string | null {
    // Check for common class names and layout patterns
    const classes = element.attributes.class?.toLowerCase() || "";
    
    if (classes.includes("sidebar") || classes.includes("aside")) {
      return "sidebar";
    }
    
    if (classes.includes("navbar") || classes.includes("header")) {
      return "navbar";
    }
    
    if (classes.includes("modal") || classes.includes("dialog")) {
      return "modal";
    }
    
    if (context.parentDisplay.includes("grid") && context.needsParentPatch) {
      return "gridChild";
    }
    
    return null;
  }

  getSemanticOperation(pattern: string, operation: string): string | null {
    const operationMap: Record<string, Record<string, string>> = {
      sidebar: {
        hide: "removeSidebar"
      },
      navbar: {
        hide: "hideNavbar"
      },
      modal: {
        hide: "closeModal"
      }
    };
    
    return operationMap[pattern]?.[operation] || null;
  }
}

// Export factory function
export function createLayoutAnalyzer(): LayoutAnalyzer {
  return new LayoutAnalyzer();
}

export function createLayoutPatternDetector(): LayoutPatternDetector {
  return new LayoutPatternDetector();
}