import type {
  InterceptNode,
  ElementNode,
  Patch,
  RestylePatch,
  ReorderPatch,
  MovePatch,
  HidePatch,
  ShowPatch,
  SetTextPatch,
  AddClassPatch,
  RemoveClassPatch,
  PatchResult,
} from "../types/index";
import {
  deepClone,
  buildUidIndex,
  findParent,
  isAncestor,
  clamp,
} from "../utils/index";
import { 
  LayoutAnalyzer, 
  LayoutPatternDetector, 
  createLayoutAnalyzer,
  createLayoutPatternDetector,
  type LayoutImpactAnalysis 
} from "./layout-analysis";

export function applyPatches(
  sourceSnapshot: InterceptNode,
  patches: Patch[],
  domRoot?: Element
): { tree: InterceptNode; warnings: string[]; enhancedPatches: Patch[] } {
  const tree = deepClone(sourceSnapshot);
  const warnings: string[] = [];
  const layoutAnalyzer = createLayoutAnalyzer();
  const patternDetector = createLayoutPatternDetector();
  const enhancedPatches: Patch[] = [];

  for (const patch of patches) {
    console.log("[🔍 Layout Analyzer] Analyzing patch:", patch.op, "on", patch.target);
    
    // Analyze layout impact before applying
    const analysis = layoutAnalyzer.analyzeLayoutImpact(tree, patch, domRoot);
    
    console.log("[🔍 Layout Analyzer] Analysis result:", {
      canApplySafely: analysis.canApplySafely,
      additionalPatches: analysis.requiredAdditionalPatches.length,
      warnings: analysis.warnings.length
    });
    
    if (!analysis.canApplySafely) {
      const warning = `Unsafe patch detected for ${patch.target}: ${analysis.warnings.join(", ")}`;
      warnings.push(warning);
      console.warn("[⚠️ Layout Analyzer]", warning);
    }
    
    // Apply original patch
    const result = applySinglePatch(tree, patch);
    if (!result.success) {
      warnings.push(...result.warnings);
    } else {
      enhancedPatches.push(patch);
      
      // Add any required additional patches for layout safety
      if (analysis.requiredAdditionalPatches.length > 0) {
        console.log("[🛡️ Layout Analyzer] Applying", analysis.requiredAdditionalPatches.length, "additional safety patches");
        for (const additionalPatch of analysis.requiredAdditionalPatches) {
          console.log("[🛡️ Layout Analyzer] Additional patch:", additionalPatch.op, "on", additionalPatch.target);
          const additionalResult = applySinglePatch(tree, additionalPatch);
          if (!additionalResult.success) {
            warnings.push(...additionalResult.warnings);
          } else {
            enhancedPatches.push(additionalPatch);
          }
        }
      }
      
      // Add any warnings from the analysis
      warnings.push(...analysis.warnings);
    }
  }

  return { tree, warnings, enhancedPatches };
}

// New function for generating compound semantic patches
export function generateSemanticPatches(
  tree: InterceptNode,
  operation: string,
  targetUid: string,
  domRoot?: Element
): Patch[] {
  const layoutAnalyzer = createLayoutAnalyzer();
  const patternDetector = createLayoutPatternDetector();
  const index = buildUidIndex(tree);
  const target = index.get(targetUid);

  if (!target || target.nodeType !== "element") {
    return [];
  }

  const targetElement = target as ElementNode;
  const domElement = domRoot?.querySelector(`[data-uid="${targetUid}"]`);
  
  if (!domElement) {
    return [];
  }

  // Detect layout pattern
  const computedStyle = window.getComputedStyle(domElement);
  const parent = domElement.parentElement;
  const parentComputedStyle = parent ? window.getComputedStyle(parent) : null;
  
  const layoutContext = {
    safe: true,
    parentDisplay: parentComputedStyle?.display || "block",
    needsParentPatch: parentComputedStyle?.display.includes("grid") || parentComputedStyle?.display.includes("flex") || false,
    suggestedFixes: [],
    warnings: [],
    isLayoutContainer: computedStyle.display.includes("grid") || computedStyle.display.includes("flex"),
    childrenUids: targetElement.children.map(child => child.uid),
    affectedElements: [],
  };

  const pattern = patternDetector.detectLayoutPattern(targetElement, layoutContext);
  const semanticOp = pattern ? patternDetector.getSemanticOperation(pattern, operation) : null;

  if (semanticOp) {
    return layoutAnalyzer.generateCompoundPatch(semanticOp, targetUid, layoutContext);
  }

  return [];
}

function applySinglePatch(tree: InterceptNode, patch: Patch): PatchResult {
  const index = buildUidIndex(tree);
  const target = index.get(patch.target);

  if (!target) {
    return warn(`Target uid "${patch.target}" not found in tree. Patch skipped.`);
  }

  switch (patch.op) {
    case "restyle":      return applyRestyle(target, patch);
    case "reorder":      return applyReorder(target, patch);
    case "move":         return applyMove(tree, target, patch, index);
    case "hide":         return applyHide(target, patch);
    case "show":         return applyShow(target, patch);
    case "setText":      return applySetText(target, patch);
    case "addClass":     return applyAddClass(target, patch);
    case "removeClass":  return applyRemoveClass(target, patch);
    default: {
      const _exhaustive: never = patch;
      return warn(`Unknown patch op. Patch skipped.`);
    }
  }
}

// ─── Restyle ───────────────────────────────────

function applyRestyle(target: InterceptNode, patch: RestylePatch): PatchResult {
  if (target.nodeType !== "element")
    return warn(`restyle: target "${patch.target}" is a text node. Skipped.`);
  target.styles = { ...target.styles, ...patch.payload.styles };
  return ok();
}

// ─── Reorder ───────────────────────────────────

function applyReorder(target: InterceptNode, patch: ReorderPatch): PatchResult {
  if (target.nodeType !== "element")
    return warn(`reorder: target "${patch.target}" is a text node. Skipped.`);

  const { order } = patch.payload;
  const childMap = new Map<string, InterceptNode>();
  for (const child of target.children) childMap.set(child.uid, child);

  const invalidUids = order.filter((uid) => !childMap.has(uid));
  if (invalidUids.length > 0)
    return warn(`reorder: non-children uids: ${invalidUids.join(", ")}. Skipped.`);

  const listed = order.map((uid) => childMap.get(uid)!);
  const listedSet = new Set(order);
  target.children = [...listed, ...target.children.filter((c) => !listedSet.has(c.uid))];
  return ok();
}

// ─── Move ──────────────────────────────────────

function applyMove(
  tree: InterceptNode,
  target: InterceptNode,
  patch: MovePatch,
  index: Map<string, InterceptNode>
): PatchResult {
  if (target.nodeType !== "element")
    return warn(`move: target "${patch.target}" is a text node. Skipped.`);

  const { newParent: newParentUid, index: insertIndex } = patch.payload;

  if (isAncestor(tree, patch.target, newParentUid))
    return warn(`move: circular move detected. Skipped.`);

  if (tree.uid === patch.target)
    return warn(`move: cannot move the root node. Skipped.`);

  const newParent = index.get(newParentUid);
  if (!newParent || newParent.nodeType !== "element")
    return warn(`move: newParent uid "${newParentUid}" invalid. Skipped.`);

  const currentParent = findParent(tree as ElementNode, patch.target);
  if (!currentParent)
    return warn(`move: could not find parent of "${patch.target}". Skipped.`);

  currentParent.children = currentParent.children.filter((c) => c.uid !== patch.target);

  const resolvedIndex = insertIndex === -1 ? newParent.children.length : insertIndex;
  const safeIndex = clamp(resolvedIndex, 0, newParent.children.length);
  newParent.children.splice(safeIndex, 0, target);
  return ok();
}

// ─── Hide / Show ───────────────────────────────

function applyHide(target: InterceptNode, _patch: HidePatch): PatchResult {
  if (target.nodeType !== "element")
    return warn(`hide: target is a text node. Skipped.`);
  target.styles = { ...target.styles, display: "none" };
  return ok();
}

function applyShow(target: InterceptNode, _patch: ShowPatch): PatchResult {
  if (target.nodeType !== "element")
    return warn(`show: target is a text node. Skipped.`);
  const { display: _removed, ...rest } = target.styles;
  target.styles = rest;
  return ok();
}

// ─── SetText ───────────────────────────────────

function applySetText(target: InterceptNode, patch: SetTextPatch): PatchResult {
  if (target.nodeType !== "text")
    return warn(`setText: target "${patch.target}" is an element node. Use a text node uid. Skipped.`);
  target.textContent = patch.payload.text;
  return ok();
}

// ─── AddClass ──────────────────────────────────

function applyAddClass(target: InterceptNode, patch: AddClassPatch): PatchResult {
  if (target.nodeType !== "element")
    return warn(`addClass: target "${patch.target}" is a text node. Skipped.`);

  const existing = (target.attributes["class"] ?? "")
    .split(" ")
    .filter(Boolean);

  // Only add classes not already present
  const toAdd = patch.payload.classes.filter((c) => !existing.includes(c));
  target.attributes["class"] = [...existing, ...toAdd].join(" ");
  return ok();
}

// ─── RemoveClass ───────────────────────────────

function applyRemoveClass(target: InterceptNode, patch: RemoveClassPatch): PatchResult {
  if (target.nodeType !== "element")
    return warn(`removeClass: target "${patch.target}" is a text node. Skipped.`);

  const toRemove = new Set(patch.payload.classes);
  const existing = (target.attributes["class"] ?? "").split(" ").filter(Boolean);
  target.attributes["class"] = existing.filter((c) => !toRemove.has(c)).join(" ");
  return ok();
}

// ─── Helpers ───────────────────────────────────

function ok(): PatchResult  { return { success: true,  warnings: [] }; }
function warn(message: string): PatchResult { return { success: false, warnings: [message] }; }