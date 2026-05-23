import type { InterceptNode, Patch } from "../types/index";
import { applyPatches } from "./engine";
import { deepClone } from "../utils/index";

export interface PreviewResult {
  success: boolean;
  previewTree: InterceptNode;
  warnings: string[];
  layoutIssues: LayoutIssue[];
  previewDescription: string;
  enhancedPatches: Patch[];
}

export interface LayoutIssue {
  severity: "warning" | "error";
  message: string;
  affectedElement: string;
  suggestedFix?: string;
}

export class PatchPreview {
  /**
   * Performs a dry-run of patches to preview their effect
   * without actually applying them to the live DOM
   */
  previewPatches(
    tree: InterceptNode,
    patches: Patch[],
    domRoot?: Element
  ): PreviewResult {
    const startTime = performance.now();
    
    try {
      // Create a deep copy for safe preview
      const previewTree = deepClone(tree);
      
      // Apply patches to the preview tree
      const { tree: patchedTree, warnings, enhancedPatches } = applyPatches(
        previewTree, 
        patches, 
        domRoot
      );
      
      // Analyze for potential layout issues
      const layoutIssues = this.detectLayoutIssues(tree, patchedTree, patches);
      
      // Generate description
      const description = this.generatePreviewDescription(patches, enhancedPatches);
      
      const endTime = performance.now();
      console.log(`Preview completed in ${endTime - startTime}ms`);
      
      return {
        success: true,
        previewTree: patchedTree,
        warnings,
        layoutIssues,
        previewDescription: description,
        enhancedPatches,
      };
      
    } catch (error) {
      return {
        success: false,
        previewTree: tree,
        warnings: [`Preview failed: ${error}`],
        layoutIssues: [],
        previewDescription: "Preview failed",
        enhancedPatches: [],
      };
    }
  }
  
  /**
   * Detects potential layout issues by comparing before/after states
   */
  private detectLayoutIssues(
    originalTree: InterceptNode,
    previewTree: InterceptNode,
    patches: Patch[]
  ): LayoutIssue[] {
    const issues: LayoutIssue[] = [];
    
    for (const patch of patches) {
      switch (patch.op) {
        case "hide":
          const hideIssues = this.analyzeHideIssues(originalTree, previewTree, patch);
          issues.push(...hideIssues);
          break;
          
        case "restyle":
          const styleIssues = this.analyzeStyleIssues(originalTree, previewTree, patch);
          issues.push(...styleIssues);
          break;
          
        case "move":
          const moveIssues = this.analyzeMoveIssues(originalTree, previewTree, patch);
          issues.push(...moveIssues);
          break;
      }
    }
    
    return issues;
  }
  
  private analyzeHideIssues(
    originalTree: InterceptNode,
    previewTree: InterceptNode,
    patch: Patch
  ): LayoutIssue[] {
    const issues: LayoutIssue[] = [];
    
    // Check if hiding this element creates layout orphans
    const element = this.findElementInTree(originalTree, patch.target);
    if (element && element.nodeType === "element") {
      const elementNode = element as any; // ElementNode
      
      if (elementNode.children && elementNode.children.length > 0) {
        issues.push({
          severity: "warning",
          message: `Hiding this element will also hide ${elementNode.children.length} child elements`,
          affectedElement: patch.target,
          suggestedFix: "Consider moving children to another container first",
        });
      }
      
      // Check if this was a layout container
      if (elementNode.styles?.display?.includes("grid") || elementNode.styles?.display?.includes("flex")) {
        issues.push({
          severity: "error", 
          message: "Hiding a layout container will break the layout structure",
          affectedElement: patch.target,
          suggestedFix: "Use a compound patch that adjusts the parent layout",
        });
      }
    }
    
    return issues;
  }
  
  private analyzeStyleIssues(
    originalTree: InterceptNode,
    previewTree: InterceptNode,
    patch: Patch
  ): LayoutIssue[] {
    const issues: LayoutIssue[] = [];
    
    const stylePatch = patch as any; // RestylePatch
    const styles = stylePatch.payload?.styles || {};
    
    // Check for potentially breaking style changes
    const breakingStyles = ["display", "position", "width", "height"];
    const hasBreakingStyles = Object.keys(styles).some(prop => breakingStyles.includes(prop));
    
    if (hasBreakingStyles) {
      issues.push({
        severity: "warning",
        message: "Style changes may affect layout of surrounding elements",
        affectedElement: patch.target,
        suggestedFix: "Review impact on parent and sibling elements",
      });
    }
    
    return issues;
  }
  
  private analyzeMoveIssues(
    originalTree: InterceptNode,
    previewTree: InterceptNode,
    patch: Patch
  ): LayoutIssue[] {
    const issues: LayoutIssue[] = [];
    
    issues.push({
      severity: "warning",
      message: "Moving elements may require style adjustments for the new container",
      affectedElement: patch.target,
      suggestedFix: "Verify that moved element works with new parent's layout system",
    });
    
    return issues;
  }
  
  private findElementInTree(tree: InterceptNode, uid: string): InterceptNode | null {
    if (tree.uid === uid) {
      return tree;
    }
    
    if (tree.nodeType === "element") {
      const elementNode = tree as any; // ElementNode
      for (const child of elementNode.children) {
        const found = this.findElementInTree(child, uid);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  private generatePreviewDescription(originalPatches: Patch[], enhancedPatches: Patch[]): string {
    if (enhancedPatches.length === 0) {
      return "No changes to apply";
    }
    
    const operations = enhancedPatches.map(patch => {
      switch (patch.op) {
        case "hide": return "hide element";
        case "show": return "show element";
        case "restyle": return "update styles";
        case "move": return "move element";
        case "reorder": return "reorder children";
        case "setText": return "update text";
        case "addClass": return "add CSS class";
        case "removeClass": return "remove CSS class";
        default: return "apply change";
      }
    });
    
    const uniqueOps = [...new Set(operations)];
    let description = uniqueOps.join(", ");
    
    if (enhancedPatches.length > originalPatches.length) {
      description += " (with layout adjustments)";
    }
    
    return description.charAt(0).toUpperCase() + description.slice(1);
  }
  
  /**
   * Generates a visual diff summary for debugging
   */
  generateVisualDiff(originalTree: InterceptNode, previewTree: InterceptNode): string {
    const changes: string[] = [];
    
    this.walkTreeComparison(originalTree, previewTree, (original, preview, path) => {
      if (!preview) {
        changes.push(`- Removed: ${path}`);
      } else if (!original) {
        changes.push(`+ Added: ${path}`);
      } else if (original.nodeType === "element" && preview.nodeType === "element") {
        const origElement = original as any; // ElementNode
        const prevElement = preview as any; // ElementNode
        
        // Check style differences
        const origStyles = JSON.stringify(origElement.styles);
        const prevStyles = JSON.stringify(prevElement.styles);
        if (origStyles !== prevStyles) {
          changes.push(`~ Modified styles: ${path}`);
        }
      }
    });
    
    return changes.length > 0 ? changes.join("\n") : "No visual changes detected";
  }
  
  private walkTreeComparison(
    original: InterceptNode | null,
    preview: InterceptNode | null,
    callback: (original: InterceptNode | null, preview: InterceptNode | null, path: string) => void,
    path = "root"
  ): void {
    callback(original, preview, path);
    
    if (original?.nodeType === "element" && preview?.nodeType === "element") {
      const origElement = original as any; // ElementNode
      const prevElement = preview as any; // ElementNode
      
      const maxChildren = Math.max(
        origElement.children?.length || 0,
        prevElement.children?.length || 0
      );
      
      for (let i = 0; i < maxChildren; i++) {
        const origChild = origElement.children?.[i];
        const prevChild = prevElement.children?.[i];
        this.walkTreeComparison(origChild, prevChild, callback, `${path}.children[${i}]`);
      }
    }
  }
}

// Factory function
export function createPatchPreview(): PatchPreview {
  return new PatchPreview();
}

// Convenience function for quick previews
export function previewPatches(
  tree: InterceptNode,
  patches: Patch[],
  domRoot?: Element
): PreviewResult {
  const preview = createPatchPreview();
  return preview.previewPatches(tree, patches, domRoot);
}