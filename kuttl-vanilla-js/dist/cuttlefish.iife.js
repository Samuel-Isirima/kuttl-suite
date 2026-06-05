var Cuttlefish = (function(exports) {
  "use strict";
  let _counter = 0;
  function generateUid() {
    return `icp-${++_counter}`;
  }
  function deepClone(node) {
    if (node.nodeType === "text") {
      return { ...node };
    }
    return {
      ...node,
      attributes: { ...node.attributes },
      styles: { ...node.styles },
      children: node.children.map(deepClone)
    };
  }
  function buildUidIndex(root, index = /* @__PURE__ */ new Map()) {
    index.set(root.uid, root);
    if (root.nodeType === "element") {
      for (const child of root.children) {
        buildUidIndex(child, index);
      }
    }
    return index;
  }
  function findParent(root, targetUid) {
    for (const child of root.children) {
      if (child.uid === targetUid) return root;
      if (child.nodeType === "element") {
        const found = findParent(child, targetUid);
        if (found) return found;
      }
    }
    return null;
  }
  function isAncestor(tree, ancestorUid, targetUid) {
    const ancestor = findByUid(tree, ancestorUid);
    if (!ancestor || ancestor.nodeType !== "element") return false;
    return containsUid(ancestor, targetUid);
  }
  function findByUid(node, uid) {
    if (node.uid === uid) return node;
    if (node.nodeType === "element") {
      for (const child of node.children) {
        const found = findByUid(child, uid);
        if (found) return found;
      }
    }
    return null;
  }
  function containsUid(node, uid) {
    for (const child of node.children) {
      if (child.uid === uid) return true;
      if (child.nodeType === "element" && containsUid(child, uid)) return true;
    }
    return false;
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function generatePatchId() {
    return crypto.randomUUID();
  }
  const DEFAULT_SKIP_TAGS = /* @__PURE__ */ new Set([
    "SCRIPT",
    "STYLE",
    "META",
    "LINK",
    "HEAD",
    "NOSCRIPT",
    "TEMPLATE"
  ]);
  function captureTree(root, config) {
    const skipTags = /* @__PURE__ */ new Set([
      ...DEFAULT_SKIP_TAGS,
      ...config.skipTags.map((t) => t.toUpperCase())
    ]);
    return captureElement(root, 0, skipTags, config.uidAttribute);
  }
  function captureElement(el, originalIndex, skipTags, uidAttr) {
    var _a;
    let uid = el.getAttribute(uidAttr);
    if (!uid) {
      uid = generateUid();
      el.setAttribute(uidAttr, uid);
    }
    const attributes = {};
    for (const attr of Array.from(el.attributes)) {
      if (attr.name !== uidAttr) {
        attributes[attr.name] = attr.value;
      }
    }
    const styles = captureInlineStyles(el);
    const initiallyHidden = ((_a = el.style) == null ? void 0 : _a.display) === "none" || el.hasAttribute("hidden");
    const children = [];
    let childIndex = 0;
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childEl = child;
        if (!skipTags.has(childEl.tagName)) {
          children.push(captureElement(childEl, childIndex, skipTags, uidAttr));
          childIndex++;
        }
      } else if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? "";
        if (text.trim().length > 0) {
          const textUid = generateUid();
          const textNode = {
            uid: textUid,
            nodeType: "text",
            textContent: text,
            domRef: child
          };
          children.push(textNode);
          childIndex++;
        }
      }
    }
    const node = {
      uid,
      nodeType: "element",
      tag: el.tagName.toLowerCase(),
      attributes,
      styles,
      children,
      originalIndex,
      initiallyHidden,
      domRef: el
    };
    return node;
  }
  function captureInlineStyles(el) {
    const styles = {};
    const htmlEl = el;
    if (!htmlEl.style) return styles;
    for (let i = 0; i < htmlEl.style.length; i++) {
      const prop = htmlEl.style.item(i);
      if (prop) {
        styles[prop] = htmlEl.style.getPropertyValue(prop);
      }
    }
    return styles;
  }
  function createPatchStore() {
    let patches = [];
    return {
      /**
       * Appends a patch to the store.
       * If a patch with the same id already exists, it is replaced in place
       * to support idempotent adds (useful for undo/redo stacks).
       */
      add(patch) {
        const existingIndex = patches.findIndex((p) => p.id === patch.id);
        if (existingIndex !== -1) {
          patches[existingIndex] = patch;
        } else {
          patches.push(patch);
        }
      },
      /**
       * Removes a patch by id.
       * Returns true if a patch was removed, false if not found.
       */
      remove(id) {
        const before = patches.length;
        patches = patches.filter((p) => p.id !== id);
        return patches.length < before;
      },
      /**
       * Returns a shallow copy of all patches in insertion order.
       * Callers receive a copy so they cannot mutate store internals.
       */
      getAll() {
        return [...patches];
      },
      /**
       * Removes all patches.
       */
      clear() {
        patches = [];
      },
      /**
       * Serializes the patch list to a JSON string.
       * Safe to write to localStorage or send over the wire.
       */
      serialize() {
        return JSON.stringify(patches);
      },
      /**
       * Replaces the current patch list with one deserialized from a JSON string.
       * Throws if the string is not valid JSON or not an array.
       * Does NOT validate individual patch shapes — caller's responsibility.
       */
      hydrate(json) {
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) {
          throw new Error(
            `[InterceptJS] PatchStore.hydrate: expected JSON array, got ${typeof parsed}`
          );
        }
        patches = parsed;
      }
    };
  }
  class LayoutAnalyzer {
    /**
     * Analyzes the layout impact of applying a patch to understand
     * what additional changes might be needed to prevent breaking the layout
     */
    analyzeLayoutImpact(tree, patch, domRoot) {
      const index = buildUidIndex(tree);
      const target = index.get(patch.target);
      if (!target || target.nodeType !== "element") {
        return {
          canApplySafely: true,
          requiredAdditionalPatches: [],
          warnings: []
        };
      }
      const targetElement = target;
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
            warnings: []
          };
      }
    }
    /**
     * Captures layout context for an element
     */
    analyzeLayoutContext(tree, target, index, domRoot) {
      const parent = this.findParent(tree, target.uid, index);
      const domElement = (domRoot == null ? void 0 : domRoot.querySelector(`[data-uid="${target.uid}"]`)) || null;
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
        childrenUids: target.children.map((child) => child.uid),
        affectedElements: isLayoutContainer ? target.children.map((child) => child.uid) : []
      };
    }
    /**
     * Analyzes the impact of hiding an element
     */
    analyzeHideOperation(target, context, index, tree) {
      const additionalPatches = [];
      const warnings = [];
      console.log("[🔍 Layout Analyzer] Checking grid context:", {
        parentDisplay: context.parentDisplay,
        includesGrid: context.parentDisplay.includes("grid"),
        targetUid: target.uid
      });
      if (context.parentDisplay.includes("grid")) {
        const parent = this.findParent(tree, target.uid, index);
        console.log("[🔍 Layout Analyzer] Found parent:", parent ? parent.uid : "null");
        if (parent) {
          additionalPatches.push({
            id: `layout-fix-${Date.now()}`,
            target: parent.uid,
            timestamp: Date.now(),
            source: "ai",
            op: "restyle",
            payload: {
              styles: {
                // Expand remaining content to full width after hiding sidebar
                gridTemplateColumns: "1fr"
                // Remove sidebar column, expand main content
              }
            }
          });
          warnings.push("Hiding this element will create a gap in the grid layout. Consider adjusting the parent container.");
        }
      }
      if (context.isLayoutContainer && context.childrenUids.length > 0) {
        warnings.push(`Hiding this container will hide ${context.childrenUids.length} child elements. Consider moving children to another container.`);
      }
      if (context.parentDisplay.includes("flex")) {
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
    analyzeShowOperation(target, context, index) {
      const warnings = [];
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
    analyzeMoveOperation(target, patch, context, index) {
      const warnings = [];
      const additionalPatches = [];
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
    analyzeRestyleOperation(target, patch, context, index) {
      const warnings = [];
      const payload = patch.payload;
      if (payload == null ? void 0 : payload.styles) {
        const layoutAffectingProps = ["display", "position", "width", "height", "margin", "padding"];
        const changesLayout = Object.keys(payload.styles).some(
          (prop) => layoutAffectingProps.includes(prop)
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
    generateCompoundPatch(operation, targetUid, context) {
      const timestamp = Date.now();
      const patches = [];
      switch (operation) {
        case "removeSidebar":
          patches.push({
            id: `remove-sidebar-${timestamp}`,
            target: targetUid,
            timestamp,
            source: "ai",
            op: "hide",
            payload: {}
          });
          if (context.parentDisplay.includes("grid")) {
            const parentUid = this.getParentUid(targetUid);
            if (parentUid) {
              patches.push({
                id: `expand-main-${timestamp}`,
                target: parentUid,
                timestamp,
                source: "ai",
                op: "restyle",
                payload: {
                  styles: {
                    gridTemplateColumns: "1fr"
                    // Expand remaining content to full width
                  }
                }
              });
            }
          }
          break;
        case "hideNavbar":
          patches.push({
            id: `hide-navbar-${timestamp}`,
            target: targetUid,
            timestamp,
            source: "ai",
            op: "hide",
            payload: {}
          });
          if (context.affectedElements.length > 0 && context.affectedElements[0]) {
            patches.push({
              id: `adjust-main-spacing-${timestamp}`,
              target: context.affectedElements[0],
              // Assuming first affected element is main content
              timestamp,
              source: "ai",
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
    findParent(tree, targetUid, index) {
      for (const node of index.values()) {
        if (node.nodeType === "element") {
          const elementNode = node;
          if (elementNode.children.some((child) => child.uid === targetUid)) {
            return elementNode;
          }
        }
      }
      return null;
    }
    getDisplayValue(element, domElement) {
      var _a;
      if (domElement) {
        return window.getComputedStyle(domElement).display;
      }
      if ((_a = element == null ? void 0 : element.styles) == null ? void 0 : _a.display) {
        return element.styles.display;
      }
      return "block";
    }
    isLayoutContainer(display) {
      return display.includes("grid") || display.includes("flex") || display.includes("table");
    }
    getParentUid(targetUid) {
      return null;
    }
  }
  class LayoutPatternDetector {
    detectLayoutPattern(element, context) {
      var _a;
      const classes = ((_a = element.attributes.class) == null ? void 0 : _a.toLowerCase()) || "";
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
    getSemanticOperation(pattern, operation) {
      var _a;
      const operationMap = {
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
      return ((_a = operationMap[pattern]) == null ? void 0 : _a[operation]) || null;
    }
  }
  function createLayoutAnalyzer() {
    return new LayoutAnalyzer();
  }
  function createLayoutPatternDetector() {
    return new LayoutPatternDetector();
  }
  function applyPatches(sourceSnapshot, patches, domRoot) {
    const tree = deepClone(sourceSnapshot);
    const warnings = [];
    const layoutAnalyzer = createLayoutAnalyzer();
    const enhancedPatches = [];
    for (const patch of patches) {
      console.log("[🔍 Layout Analyzer] Analyzing patch:", patch.op, "on", patch.target);
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
      const result = applySinglePatch(tree, patch);
      if (!result.success) {
        warnings.push(...result.warnings);
      } else {
        enhancedPatches.push(patch);
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
        warnings.push(...analysis.warnings);
      }
    }
    return { tree, warnings, enhancedPatches };
  }
  function generateSemanticPatches(tree, operation, targetUid, domRoot) {
    const layoutAnalyzer = createLayoutAnalyzer();
    const patternDetector = createLayoutPatternDetector();
    const index = buildUidIndex(tree);
    const target = index.get(targetUid);
    if (!target || target.nodeType !== "element") {
      return [];
    }
    const targetElement = target;
    const domElement = domRoot == null ? void 0 : domRoot.querySelector(`[data-uid="${targetUid}"]`);
    if (!domElement) {
      return [];
    }
    const computedStyle = window.getComputedStyle(domElement);
    const parent = domElement.parentElement;
    const parentComputedStyle = parent ? window.getComputedStyle(parent) : null;
    const layoutContext = {
      safe: true,
      parentDisplay: (parentComputedStyle == null ? void 0 : parentComputedStyle.display) || "block",
      needsParentPatch: (parentComputedStyle == null ? void 0 : parentComputedStyle.display.includes("grid")) || (parentComputedStyle == null ? void 0 : parentComputedStyle.display.includes("flex")) || false,
      suggestedFixes: [],
      warnings: [],
      isLayoutContainer: computedStyle.display.includes("grid") || computedStyle.display.includes("flex"),
      childrenUids: targetElement.children.map((child) => child.uid),
      affectedElements: []
    };
    const pattern = patternDetector.detectLayoutPattern(targetElement, layoutContext);
    const semanticOp = pattern ? patternDetector.getSemanticOperation(pattern, operation) : null;
    if (semanticOp) {
      return layoutAnalyzer.generateCompoundPatch(semanticOp, targetUid, layoutContext);
    }
    return [];
  }
  function applySinglePatch(tree, patch) {
    const index = buildUidIndex(tree);
    const target = index.get(patch.target);
    if (!target) {
      return warn(`Target uid "${patch.target}" not found in tree. Patch skipped.`);
    }
    switch (patch.op) {
      case "restyle":
        return applyRestyle(target, patch);
      case "reorder":
        return applyReorder(target, patch);
      case "move":
        return applyMove(tree, target, patch, index);
      case "hide":
        return applyHide(target);
      case "show":
        return applyShow(target);
      case "setText":
        return applySetText(target, patch);
      case "addClass":
        return applyAddClass(target, patch);
      case "removeClass":
        return applyRemoveClass(target, patch);
      default: {
        return warn(`Unknown patch op. Patch skipped.`);
      }
    }
  }
  function applyRestyle(target, patch) {
    if (target.nodeType !== "element")
      return warn(`restyle: target "${patch.target}" is a text node. Skipped.`);
    target.styles = { ...target.styles, ...patch.payload.styles };
    return ok();
  }
  function applyReorder(target, patch) {
    if (target.nodeType !== "element")
      return warn(`reorder: target "${patch.target}" is a text node. Skipped.`);
    const { order } = patch.payload;
    const childMap = /* @__PURE__ */ new Map();
    for (const child of target.children) childMap.set(child.uid, child);
    const invalidUids = order.filter((uid) => !childMap.has(uid));
    if (invalidUids.length > 0)
      return warn(`reorder: non-children uids: ${invalidUids.join(", ")}. Skipped.`);
    const listed = order.map((uid) => childMap.get(uid));
    const listedSet = new Set(order);
    target.children = [...listed, ...target.children.filter((c) => !listedSet.has(c.uid))];
    return ok();
  }
  function applyMove(tree, target, patch, index) {
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
    const currentParent = findParent(tree, patch.target);
    if (!currentParent)
      return warn(`move: could not find parent of "${patch.target}". Skipped.`);
    currentParent.children = currentParent.children.filter((c) => c.uid !== patch.target);
    const resolvedIndex = insertIndex === -1 ? newParent.children.length : insertIndex;
    const safeIndex = clamp(resolvedIndex, 0, newParent.children.length);
    newParent.children.splice(safeIndex, 0, target);
    return ok();
  }
  function applyHide(target, _patch) {
    if (target.nodeType !== "element")
      return warn(`hide: target is a text node. Skipped.`);
    target.styles = { ...target.styles, display: "none" };
    return ok();
  }
  function applyShow(target, _patch) {
    if (target.nodeType !== "element")
      return warn(`show: target is a text node. Skipped.`);
    const { display: _removed, ...rest } = target.styles;
    target.styles = rest;
    return ok();
  }
  function applySetText(target, patch) {
    if (target.nodeType !== "text")
      return warn(`setText: target "${patch.target}" is an element node. Use a text node uid. Skipped.`);
    target.textContent = patch.payload.text;
    return ok();
  }
  function applyAddClass(target, patch) {
    if (target.nodeType !== "element")
      return warn(`addClass: target "${patch.target}" is a text node. Skipped.`);
    const existing = (target.attributes["class"] ?? "").split(" ").filter(Boolean);
    const toAdd = patch.payload.classes.filter((c) => !existing.includes(c));
    target.attributes["class"] = [...existing, ...toAdd].join(" ");
    return ok();
  }
  function applyRemoveClass(target, patch) {
    if (target.nodeType !== "element")
      return warn(`removeClass: target "${patch.target}" is a text node. Skipped.`);
    const toRemove = new Set(patch.payload.classes);
    const existing = (target.attributes["class"] ?? "").split(" ").filter(Boolean);
    target.attributes["class"] = existing.filter((c) => !toRemove.has(c)).join(" ");
    return ok();
  }
  function ok() {
    return { success: true, warnings: [] };
  }
  function warn(message) {
    return { success: false, warnings: [message] };
  }
  class PatchPreview {
    /**
     * Performs a dry-run of patches to preview their effect
     * without actually applying them to the live DOM
     */
    previewPatches(tree, patches, domRoot) {
      const startTime = performance.now();
      try {
        const previewTree = deepClone(tree);
        const { tree: patchedTree, warnings, enhancedPatches } = applyPatches(
          previewTree,
          patches,
          domRoot
        );
        const layoutIssues = this.detectLayoutIssues(tree, patchedTree, patches);
        const description = this.generatePreviewDescription(patches, enhancedPatches);
        const endTime = performance.now();
        console.log(`Preview completed in ${endTime - startTime}ms`);
        return {
          success: true,
          previewTree: patchedTree,
          warnings,
          layoutIssues,
          previewDescription: description,
          enhancedPatches
        };
      } catch (error) {
        return {
          success: false,
          previewTree: tree,
          warnings: [`Preview failed: ${error}`],
          layoutIssues: [],
          previewDescription: "Preview failed",
          enhancedPatches: []
        };
      }
    }
    /**
     * Detects potential layout issues by comparing before/after states
     */
    detectLayoutIssues(originalTree, previewTree, patches) {
      const issues = [];
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
    analyzeHideIssues(originalTree, previewTree, patch) {
      var _a, _b, _c, _d;
      const issues = [];
      const element = this.findElementInTree(originalTree, patch.target);
      if (element && element.nodeType === "element") {
        const elementNode = element;
        if (elementNode.children && elementNode.children.length > 0) {
          issues.push({
            severity: "warning",
            message: `Hiding this element will also hide ${elementNode.children.length} child elements`,
            affectedElement: patch.target,
            suggestedFix: "Consider moving children to another container first"
          });
        }
        if (((_b = (_a = elementNode.styles) == null ? void 0 : _a.display) == null ? void 0 : _b.includes("grid")) || ((_d = (_c = elementNode.styles) == null ? void 0 : _c.display) == null ? void 0 : _d.includes("flex"))) {
          issues.push({
            severity: "error",
            message: "Hiding a layout container will break the layout structure",
            affectedElement: patch.target,
            suggestedFix: "Use a compound patch that adjusts the parent layout"
          });
        }
      }
      return issues;
    }
    analyzeStyleIssues(originalTree, previewTree, patch) {
      var _a;
      const issues = [];
      const stylePatch = patch;
      const styles = ((_a = stylePatch.payload) == null ? void 0 : _a.styles) || {};
      const breakingStyles = ["display", "position", "width", "height"];
      const hasBreakingStyles = Object.keys(styles).some((prop) => breakingStyles.includes(prop));
      if (hasBreakingStyles) {
        issues.push({
          severity: "warning",
          message: "Style changes may affect layout of surrounding elements",
          affectedElement: patch.target,
          suggestedFix: "Review impact on parent and sibling elements"
        });
      }
      return issues;
    }
    analyzeMoveIssues(originalTree, previewTree, patch) {
      const issues = [];
      issues.push({
        severity: "warning",
        message: "Moving elements may require style adjustments for the new container",
        affectedElement: patch.target,
        suggestedFix: "Verify that moved element works with new parent's layout system"
      });
      return issues;
    }
    findElementInTree(tree, uid) {
      if (tree.uid === uid) {
        return tree;
      }
      if (tree.nodeType === "element") {
        const elementNode = tree;
        for (const child of elementNode.children) {
          const found = this.findElementInTree(child, uid);
          if (found) return found;
        }
      }
      return null;
    }
    generatePreviewDescription(originalPatches, enhancedPatches) {
      if (enhancedPatches.length === 0) {
        return "No changes to apply";
      }
      const operations = enhancedPatches.map((patch) => {
        switch (patch.op) {
          case "hide":
            return "hide element";
          case "show":
            return "show element";
          case "restyle":
            return "update styles";
          case "move":
            return "move element";
          case "reorder":
            return "reorder children";
          case "setText":
            return "update text";
          case "addClass":
            return "add CSS class";
          case "removeClass":
            return "remove CSS class";
          default:
            return "apply change";
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
    generateVisualDiff(originalTree, previewTree) {
      const changes = [];
      this.walkTreeComparison(originalTree, previewTree, (original, preview, path) => {
        if (!preview) {
          changes.push(`- Removed: ${path}`);
        } else if (!original) {
          changes.push(`+ Added: ${path}`);
        } else if (original.nodeType === "element" && preview.nodeType === "element") {
          const origElement = original;
          const prevElement = preview;
          const origStyles = JSON.stringify(origElement.styles);
          const prevStyles = JSON.stringify(prevElement.styles);
          if (origStyles !== prevStyles) {
            changes.push(`~ Modified styles: ${path}`);
          }
        }
      });
      return changes.length > 0 ? changes.join("\n") : "No visual changes detected";
    }
    walkTreeComparison(original, preview, callback, path = "root") {
      var _a, _b, _c, _d;
      callback(original, preview, path);
      if ((original == null ? void 0 : original.nodeType) === "element" && (preview == null ? void 0 : preview.nodeType) === "element") {
        const origElement = original;
        const prevElement = preview;
        const maxChildren = Math.max(
          ((_a = origElement.children) == null ? void 0 : _a.length) || 0,
          ((_b = prevElement.children) == null ? void 0 : _b.length) || 0
        );
        for (let i = 0; i < maxChildren; i++) {
          const origChild = (_c = origElement.children) == null ? void 0 : _c[i];
          const prevChild = (_d = prevElement.children) == null ? void 0 : _d[i];
          this.walkTreeComparison(origChild, prevChild, callback, `${path}.children[${i}]`);
        }
      }
    }
  }
  function createPatchPreview() {
    return new PatchPreview();
  }
  function previewPatches(tree, patches, domRoot) {
    const preview = createPatchPreview();
    return preview.previewPatches(tree, patches, domRoot);
  }
  function reconcile(oldTree, newTree, debug = false) {
    reconcileNode(oldTree, newTree, debug);
  }
  function reconcileNode(oldNode, newNode, debug) {
    if (oldNode.nodeType === "text" && newNode.nodeType === "text") {
      reconcileText(oldNode, newNode);
      return;
    }
    if (oldNode.nodeType === "element" && newNode.nodeType === "element") {
      reconcileElement(oldNode, newNode, debug);
      return;
    }
    log(debug, `reconcileNode: node type mismatch for uid "${oldNode.uid}". Skipping.`);
  }
  function reconcileText(oldNode, newNode) {
    if (oldNode.textContent !== newNode.textContent) {
      newNode.domRef.textContent = newNode.textContent;
    }
  }
  function reconcileElement(oldNode, newNode, debug) {
    const el = newNode.domRef;
    if (!document.contains(el)) {
      log(debug, `reconcile: domRef for uid "${newNode.uid}" is no longer in the document. Skipping.`);
      return;
    }
    if (oldNode.tag !== newNode.tag) {
      replaceElement(oldNode, newNode);
      return;
    }
    reconcileAttributes(oldNode, newNode, el);
    reconcileStyles(oldNode, newNode, el);
    reconcileChildren(oldNode, newNode, el, debug);
  }
  function reconcileAttributes(oldNode, newNode, el) {
    const oldAttrs = oldNode.attributes;
    const newAttrs = newNode.attributes;
    for (const [key, value] of Object.entries(newAttrs)) {
      if (oldAttrs[key] !== value) {
        el.setAttribute(key, value);
      }
    }
    for (const key of Object.keys(oldAttrs)) {
      if (!(key in newAttrs)) {
        el.removeAttribute(key);
      }
    }
  }
  function reconcileStyles(oldNode, newNode, el) {
    const oldStyles = oldNode.styles;
    const newStyles = newNode.styles;
    for (const [prop, value] of Object.entries(newStyles)) {
      if (oldStyles[prop] !== value) {
        el.style.setProperty(prop, value);
      }
    }
    for (const prop of Object.keys(oldStyles)) {
      if (!(prop in newStyles)) {
        el.style.removeProperty(prop);
      }
    }
  }
  function reconcileChildren(oldNode, newNode, parentEl, debug) {
    var _a;
    const oldChildren = oldNode.children;
    const newChildren = newNode.children;
    const oldMap = /* @__PURE__ */ new Map();
    for (const child of oldChildren) {
      oldMap.set(child.uid, child);
    }
    const newUids = new Set(newChildren.map((c) => c.uid));
    for (const oldChild of oldChildren) {
      if (!newUids.has(oldChild.uid)) {
        const domNode = oldChild.domRef;
        if (domNode.parentNode === parentEl) {
          const saved = saveScrollState(domNode);
          parentEl.removeChild(domNode);
          if (saved && oldChild.nodeType === "element") {
            oldChild._savedScroll = saved;
          }
        }
      }
    }
    for (let i = 0; i < newChildren.length; i++) {
      const newChild = newChildren[i];
      if (!newChild) continue;
      const domNode = newChild.domRef;
      const oldChild = oldMap.get(newChild.uid);
      const nextSibling = findNextSiblingDomRef(newChildren, i + 1, parentEl);
      const currentNextSibling = domNode.nextSibling;
      const isAtCorrectPosition = domNode.parentNode === parentEl && currentNextSibling === nextSibling;
      if (!isAtCorrectPosition) {
        const focused = getFocusedDescendant(domNode);
        const scrollState = domNode.nodeType === Node.ELEMENT_NODE ? saveScrollState(domNode) : null;
        const inputValue = getInputValue(domNode);
        parentEl.insertBefore(domNode, nextSibling);
        if (focused && document.activeElement !== focused) {
          (_a = focused.focus) == null ? void 0 : _a.call(focused);
        }
        if (scrollState) restoreScrollState(domNode, scrollState);
        if (inputValue !== null) setInputValue(domNode, inputValue);
      }
      if (oldChild) {
        reconcileNode(oldChild, newChild, debug);
      }
    }
  }
  function replaceElement(oldNode, newNode, _debug) {
    const oldEl = oldNode.domRef;
    const parent = oldEl.parentNode;
    if (!parent) return;
    const newEl = document.createElement(newNode.tag);
    for (const [key, value] of Object.entries(newNode.attributes)) {
      newEl.setAttribute(key, value);
    }
    for (const [prop, value] of Object.entries(newNode.styles)) {
      newEl.style.setProperty(prop, value);
    }
    while (oldEl.firstChild) {
      newEl.appendChild(oldEl.firstChild);
    }
    parent.replaceChild(newEl, oldEl);
    newNode.domRef = newEl;
  }
  function findNextSiblingDomRef(children, fromIndex, parentEl) {
    for (let i = fromIndex; i < children.length; i++) {
      const child = children[i];
      if (child && child.domRef.parentNode === parentEl) {
        return child.domRef;
      }
    }
    return null;
  }
  function getFocusedDescendant(node) {
    const active = document.activeElement;
    if (!active || active === document.body) return null;
    if (node.contains(active)) return active;
    return null;
  }
  function saveScrollState(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node;
    if (el.scrollTop === 0 && el.scrollLeft === 0) return null;
    return { top: el.scrollTop, left: el.scrollLeft };
  }
  function restoreScrollState(node, state) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node;
    el.scrollTop = state.top;
    el.scrollLeft = state.left;
  }
  function getInputValue(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      return el.value;
    }
    return null;
  }
  function setInputValue(node, value) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      el.value = value;
    }
  }
  function log(debug, message) {
    if (debug) console.warn(`[InterceptJS]`, message);
  }
  const STORAGE_KEY = "kuttl_fp";
  function collect() {
    var _a;
    const c = [];
    c.push(`s:${screen.width}x${screen.height}x${screen.colorDepth}`);
    try {
      c.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    } catch {
      c.push(`tzo:${(/* @__PURE__ */ new Date()).getTimezoneOffset()}`);
    }
    c.push(`lang:${navigator.language}`);
    if ((_a = navigator.languages) == null ? void 0 : _a.length) c.push(`langs:${navigator.languages.join(",")}`);
    c.push(`plat:${navigator.platform}`);
    if (navigator.hardwareConcurrency) c.push(`cpu:${navigator.hardwareConcurrency}`);
    if (navigator.deviceMemory) c.push(`mem:${navigator.deviceMemory}`);
    try {
      const cv = document.createElement("canvas");
      const ctx = cv.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(0, 0, 10, 10);
        ctx.fillStyle = "#069";
        ctx.fillText("kuttl", 2, 2);
        c.push(`cv:${cv.toDataURL().slice(22, 50)}`);
      }
    } catch {
      c.push("cv:err");
    }
    return c;
  }
  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h ^ s.charCodeAt(i)) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }
  let _cached = null;
  function getFingerprint() {
    if (_cached) return _cached;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        _cached = stored;
        return _cached;
      }
    } catch {
    }
    _cached = hash(collect().sort().join("|"));
    try {
      sessionStorage.setItem(STORAGE_KEY, _cached);
    } catch {
    }
    return _cached;
  }
  const DEFAULT_API_BASE = "http://localhost:8080";
  function countTreeNodes(node) {
    if (node.nodeType === "text") return 1;
    return 1 + node.children.reduce((sum, child) => sum + countTreeNodes(child), 0);
  }
  function findNodesWithLayoutContext(node) {
    const result = [];
    if (node.nodeType === "element") {
      const element = node;
      if (element.layoutContext) {
        result.push({
          uid: element.uid,
          tag: element.tag,
          layoutContext: element.layoutContext
        });
      }
      for (const child of element.children) {
        result.push(...findNodesWithLayoutContext(child));
      }
    }
    return result;
  }
  function createAILayer(websiteKey, apiBaseUrl) {
    const proxyUrl = `${(apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/$/, "")}/api/prompt`;
    return {
      async prompt(userPrompt, workingTree, descAttr, selection, websiteId) {
        var _a;
        console.log("[🤖 AI Layer] Sending tree to AI with", countTreeNodes(workingTree), "nodes");
        const nodesWithLayout = findNodesWithLayoutContext(workingTree);
        console.log("[🤖 AI Layer] Nodes with layout context:", nodesWithLayout.length);
        if (nodesWithLayout.length > 0) {
          console.log("[🤖 AI Layer] Sample layout context:", nodesWithLayout[0]);
        }
        const body = {
          prompt: userPrompt,
          tree: workingTree,
          descAttr,
          selection,
          websiteId
        };
        const reqHeaders = {
          "Content-Type": "application/json",
          "X-Browser-Fingerprint": getFingerprint()
        };
        if (websiteKey) reqHeaders["X-Website-Key"] = websiteKey;
        let response;
        try {
          response = await fetch(proxyUrl, {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify(body)
          });
        } catch (err) {
          return errorStatus(`Network error: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          return errorStatus(`Proxy error ${response.status}: ${text || response.statusText}`);
        }
        let data;
        try {
          data = await response.json();
        } catch {
          return errorStatus("Proxy returned non-JSON response.");
        }
        return {
          result: {
            patches: data.patches ?? [],
            warnings: data.warnings ?? [],
            raw: data.raw ?? ""
          },
          status: data.status === "error" ? { state: "error", message: ((_a = data.warnings) == null ? void 0 : _a[0]) ?? "Unknown error" } : { state: "idle" }
        };
      }
    };
  }
  function errorStatus(message) {
    return {
      result: { patches: [], warnings: [message], raw: "" },
      status: { state: "error", message }
    };
  }
  const RELEVANT_COMPUTED_PROPS = [
    "display",
    "position",
    "color",
    "background-color",
    "font-size",
    "font-weight",
    "font-family",
    "padding",
    "margin",
    "width",
    "height",
    "border",
    "border-radius",
    "opacity",
    "flex-direction",
    "grid-template-columns",
    "z-index",
    "overflow"
  ];
  function inferDescription(el, descAttr) {
    var _a;
    const explicit = el.getAttribute(descAttr);
    if (explicit) return explicit;
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel) return ariaLabel;
    const text = (_a = el.textContent) == null ? void 0 : _a.trim().slice(0, 60);
    if (text && text.length < 60 && !text.includes("\n")) return `"${text}"`;
    if (el.id) return `#${el.id}`;
    return `<${el.tagName.toLowerCase()}>`;
  }
  function captureComputedStyles(el) {
    const computed = window.getComputedStyle(el);
    const result = {};
    for (const prop of RELEVANT_COMPUTED_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value) result[prop] = value;
    }
    return result;
  }
  const PIN_CLASS = "__ctf_pinned__";
  const PIN_STYLE_ID = "__ctf_pin_style__";
  function ensurePinStyle() {
    if (document.getElementById(PIN_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = PIN_STYLE_ID;
    style.textContent = `
    .${PIN_CLASS} {
      outline: 2px solid #3a8a3a !important;
      outline-offset: 1px !important;
      box-shadow: 0 0 0 4px rgba(58,138,58,0.08) !important;
    }
  `;
    document.head.appendChild(style);
  }
  function pinElement(el) {
    clearPin();
    el.classList.add(PIN_CLASS);
  }
  function clearPin() {
    console.log("clear pin called");
    document.querySelectorAll(`.${PIN_CLASS}`).forEach(
      (el) => el.classList.remove(PIN_CLASS)
    );
  }
  let overlayEl = null;
  let labelEl = null;
  function createOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement("div");
    overlayEl.id = "__icp_select_overlay__";
    Object.assign(overlayEl.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "2147483638",
      border: "2px solid #3a8a3a",
      background: "rgba(58,138,58,0.06)",
      display: "none",
      boxSizing: "border-box"
    });
    labelEl = document.createElement("div");
    Object.assign(labelEl.style, {
      position: "absolute",
      top: "-22px",
      left: "0",
      background: "#3a8a3a",
      color: "#fff",
      fontSize: "10px",
      padding: "2px 6px"
    });
    overlayEl.appendChild(labelEl);
    document.body.appendChild(overlayEl);
  }
  function showOverlay(el) {
    if (!overlayEl || !labelEl) return;
    const rect = el.getBoundingClientRect();
    Object.assign(overlayEl.style, {
      display: "block",
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
    labelEl.style.top = rect.top < 25 ? "0" : "-22px";
    labelEl.textContent = `${el.tagName.toLowerCase()}#${el.getAttribute("data-uid") ?? "?"}`;
  }
  function hideOverlay() {
    if (overlayEl) overlayEl.style.display = "none";
  }
  function createSelector(root, config) {
    let enabled = false;
    let selected = null;
    let hoveredEl = null;
    ensurePinStyle();
    createOverlay();
    function repaint() {
      if (hoveredEl) showOverlay(hoveredEl);
    }
    function onMouseOver(e) {
      if (!enabled) return;
      const target = e.target.closest(`[${config.uidAttribute}]`);
      if (!target || !root.contains(target)) {
        hoveredEl = null;
        hideOverlay();
        return;
      }
      hoveredEl = target;
      showOverlay(target);
    }
    function onClick(e) {
      if (!enabled) return;
      const target = e.target.closest(`[${config.uidAttribute}]`);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      pinElement(target);
      selected = {
        uid: target.getAttribute(config.uidAttribute),
        tag: target.tagName.toLowerCase(),
        description: inferDescription(target, config.descriptionAttribute),
        computedStyles: captureComputedStyles(target),
        rect: target.getBoundingClientRect(),
        classes: target.className.split(" ").filter(Boolean)
      };
      handle.disable();
      config.onSelect(selected);
    }
    const handle = {
      enable() {
        enabled = true;
        root.addEventListener("mouseover", onMouseOver, true);
        root.addEventListener("click", onClick, true);
        window.addEventListener("scroll", repaint, { passive: true, capture: true });
        document.body.style.cursor = "crosshair";
      },
      disable() {
        enabled = false;
        root.removeEventListener("mouseover", onMouseOver, true);
        root.removeEventListener("click", onClick, true);
        window.removeEventListener("scroll", repaint, true);
        document.body.style.cursor = "";
        hideOverlay();
      },
      isEnabled: () => enabled,
      getSelected: () => selected,
      clearSelected: () => {
        selected = null;
        clearPin();
        hideOverlay();
      }
    };
    return handle;
  }
  class WebsiteSerializer {
    constructor(config = {}) {
      this.lastSnapshot = null;
      this.config = {
        uidAttribute: config.uidAttribute ?? "data-uid",
        descriptionAttribute: config.descriptionAttribute ?? "data-description"
      };
    }
    /**
     * Creates a complete website snapshot from the current state
     */
    createSnapshot(interceptTree, patches, root, websiteId, userId, sessionId, promptContext) {
      const startTime = performance.now();
      const components = this.serializeComponents(interceptTree);
      const styles = this.serializeStyles(components, root);
      const layout = this.serializeLayout(components, root);
      const userCustomizations = this.serializeCustomizations(patches, components);
      const metadata = this.createMetadata(
        websiteId,
        userId,
        sessionId,
        components,
        startTime
      );
      const snapshot = {
        components,
        styles,
        layout,
        userCustomizations,
        metadata,
        ...promptContext && { promptContext }
      };
      this.lastSnapshot = snapshot;
      return snapshot;
    }
    /**
     * Creates a diff between the current state and the last snapshot
     */
    createDiff(currentSnapshot) {
      if (!this.lastSnapshot) {
        return null;
      }
      const diff = {
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
        )
      };
      return diff;
    }
    /**
     * Applies a diff to update the snapshot incrementally
     */
    applyDiff(baseSnapshot, diff) {
      const updatedSnapshot = structuredClone(baseSnapshot);
      this.applyComponentDiff(updatedSnapshot.components, diff.components);
      this.applyStyleDiff(updatedSnapshot.styles, diff.styles);
      this.applyLayoutDiff(updatedSnapshot.layout, diff.layout);
      this.applyCustomizationDiff(
        updatedSnapshot.userCustomizations,
        diff.customizations
      );
      updatedSnapshot.metadata.version = diff.toVersion;
      updatedSnapshot.metadata.timestamp = diff.timestamp;
      return updatedSnapshot;
    }
    // ─────────────────────────────────────────────
    // Component Serialization
    // ─────────────────────────────────────────────
    serializeComponents(node) {
      const components = [];
      const componentMap = /* @__PURE__ */ new Map();
      this.walkTree(node, (currentNode) => {
        if (currentNode.nodeType === "element") {
          const component = this.serializeComponent(currentNode);
          components.push(component);
          componentMap.set(component.uid, component);
        }
      });
      this.populateRelationships(components, componentMap);
      return components;
    }
    serializeComponent(element) {
      const domElement = element.domRef;
      return {
        uid: element.uid,
        element: this.serializeElementNode(element),
        visualState: domElement instanceof Element ? this.captureVisualState(domElement) : this.createEmptyVisualState(),
        relationships: this.createEmptyRelationships(),
        interactions: domElement instanceof Element ? this.captureInteractionCapabilities(domElement) : this.createEmptyInteractionCapabilities()
      };
    }
    serializeElementNode(element) {
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
        semanticRole: domElement instanceof Element ? this.detectSemanticRole(domElement) : "",
        accessibilityInfo: domElement instanceof Element ? this.captureAccessibilityInfo(domElement) : this.createEmptyAccessibilityInfo(),
        ...domElement instanceof Element && { layoutContext: this.captureLayoutContext(domElement, element) }
      };
    }
    captureVisualState(element) {
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
        effects: this.captureVisualEffects(computedStyle)
      };
    }
    captureInteractionCapabilities(element) {
      const tag = element.tagName.toLowerCase();
      const computedStyle = window.getComputedStyle(element);
      const interactiveElements = /* @__PURE__ */ new Set([
        "a",
        "button",
        "input",
        "textarea",
        "select",
        "option",
        "details",
        "summary",
        "area",
        "audio",
        "video"
      ]);
      const isInteractive = interactiveElements.has(tag) || element.hasAttribute("tabindex") || element.hasAttribute("onclick") || computedStyle.cursor === "pointer";
      return {
        isInteractive,
        isSelectable: this.isSelectable(element, computedStyle),
        isFocusable: this.isFocusable(element),
        supportedEvents: this.getSupportedEvents(element, tag),
        currentState: this.captureInteractionState(element),
        customizableProperties: this.getCustomizableProperties(element, computedStyle),
        constraints: {
          readonly: element.hasAttribute("readonly")
        }
      };
    }
    // ─────────────────────────────────────────────
    // Style Serialization
    // ─────────────────────────────────────────────
    serializeStyles(components, root) {
      return {
        globalRules: this.captureGlobalRules(),
        componentStyles: this.captureComponentStyles(components),
        designTokens: this.extractDesignTokens(),
        customCSS: this.extractCustomCSS()
      };
    }
    captureGlobalRules() {
      const rules = [];
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
                    mediaQuery: this.getMediaQuery(rule)
                  });
                }
              }
            }
          } catch (e) {
            console.warn("Cannot access stylesheet rules:", e);
          }
        }
      } catch (e) {
        console.warn("Error capturing global CSS rules:", e);
      }
      return rules;
    }
    captureComponentStyles(components) {
      const componentStyles = {};
      for (const component of components) {
        const element = document.querySelector(`[${this.config.uidAttribute}="${component.uid}"]`);
        if (element) {
          window.getComputedStyle(element);
          componentStyles[component.uid] = {
            computed: this.captureComputedStyles(element),
            inline: component.element.styles,
            classes: Array.from(element.classList),
            pseudoStates: this.capturePseudoStates(element)
          };
        }
      }
      return componentStyles;
    }
    // ─────────────────────────────────────────────
    // Layout Serialization
    // ─────────────────────────────────────────────
    serializeLayout(components, root) {
      const containers = this.detectLayoutContainers(components);
      return {
        layoutType: this.detectMainLayoutType(root),
        containers,
        positioningContext: this.capturePositioningContext(components),
        breakpoints: this.detectResponsiveBreakpoints(),
        stackingContext: this.captureStackingContext(components)
      };
    }
    detectLayoutContainers(components) {
      return components.filter((component) => this.isLayoutContainer(component)).map((component) => {
        const element = document.querySelector(`[${this.config.uidAttribute}="${component.uid}"]`);
        const computedStyle = window.getComputedStyle(element);
        return {
          uid: component.uid,
          type: this.detectContainerType(computedStyle),
          properties: this.captureLayoutProperties(computedStyle),
          children: component.element.children.map((childUid) => ({
            uid: childUid,
            order: 0,
            // Will be populated separately
            constraints: {}
          }))
        };
      });
    }
    // ─────────────────────────────────────────────
    // Customization Serialization
    // ─────────────────────────────────────────────
    serializeCustomizations(patches, components) {
      return {
        patches: [...patches],
        customizationHistory: this.createCustomizationHistory(patches),
        activeContext: this.createActiveContext(components),
        customizationMetadata: this.createCustomizationMetadata(patches)
      };
    }
    createCustomizationHistory(patches) {
      return patches.map((patch) => ({
        id: patch.id,
        timestamp: patch.timestamp,
        type: this.mapPatchToCustomizationType(patch.op),
        target: patch.target,
        changes: this.extractChangesFromPatch(patch),
        userIntent: "",
        aiGenerated: patch.source === "ai"
      }));
    }
    // ─────────────────────────────────────────────
    // Diff Operations
    // ─────────────────────────────────────────────
    diffComponents(oldComponents, newComponents) {
      const oldMap = new Map(oldComponents.map((c) => [c.uid, c]));
      const newMap = new Map(newComponents.map((c) => [c.uid, c]));
      const added = newComponents.filter((c) => !oldMap.has(c.uid));
      const removed = oldComponents.filter((c) => !newMap.has(c.uid)).map((c) => c.uid);
      const modified = [];
      for (const newComponent of newComponents) {
        const oldComponent = oldMap.get(newComponent.uid);
        if (oldComponent) {
          const changes = this.detectComponentChanges(oldComponent, newComponent);
          if (Object.keys(changes).length > 0) {
            modified.push({
              uid: newComponent.uid,
              changes
            });
          }
        }
      }
      return {
        added,
        modified,
        removed,
        reordered: []
        // Will be implemented based on specific needs
      };
    }
    diffStyles(oldStyles, newStyles) {
      return {
        globalRules: {
          added: [],
          modified: [],
          removed: []
        },
        componentStyles: {},
        designTokens: {}
      };
    }
    diffLayout(oldLayout, newLayout) {
      return {
        containers: {
          added: [],
          modified: [],
          removed: []
        },
        positioningChanges: [],
        responsiveChanges: []
      };
    }
    diffCustomizations(oldCustomizations, newCustomizations) {
      const oldPatches = new Set(oldCustomizations.patches.map((p) => p.id));
      const newPatches = newCustomizations.patches;
      return {
        patches: {
          added: newPatches.filter((p) => !oldPatches.has(p.id)),
          removed: []
        },
        historyEntries: {
          added: []
        },
        contextChanges: {}
      };
    }
    // ─────────────────────────────────────────────
    // Utility Methods
    // ─────────────────────────────────────────────
    walkTree(node, callback) {
      callback(node);
      if (node.nodeType === "element") {
        for (const child of node.children) {
          this.walkTree(child, callback);
        }
      }
    }
    isElementVisible(element, computedStyle) {
      return computedStyle.display !== "none" && computedStyle.visibility !== "hidden" && parseFloat(computedStyle.opacity) > 0 && !element.hasAttribute("hidden");
    }
    captureBoundingRect(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left
      };
    }
    capturePosition(element, computedStyle) {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        z: parseInt(computedStyle.zIndex) || 0,
        type: computedStyle.position
      };
    }
    captureDimensions(rect, computedStyle) {
      const minWidth = this.parsePixelValue(computedStyle.minWidth);
      const maxWidth = this.parsePixelValue(computedStyle.maxWidth);
      const minHeight = this.parsePixelValue(computedStyle.minHeight);
      const maxHeight = this.parsePixelValue(computedStyle.maxHeight);
      const result = {
        width: rect.width,
        height: rect.height
      };
      if (minWidth !== void 0) result.minWidth = minWidth;
      if (maxWidth !== void 0) result.maxWidth = maxWidth;
      if (minHeight !== void 0) result.minHeight = minHeight;
      if (maxHeight !== void 0) result.maxHeight = maxHeight;
      return result;
    }
    captureColorPalette(computedStyle) {
      return {
        primary: computedStyle.color,
        secondary: "",
        background: computedStyle.backgroundColor,
        text: computedStyle.color,
        border: computedStyle.borderColor,
        accent: ""
      };
    }
    captureTypography(computedStyle) {
      return {
        fontFamily: computedStyle.fontFamily,
        fontSize: this.parsePixelValue(computedStyle.fontSize) || 16,
        fontWeight: parseInt(computedStyle.fontWeight) || 400,
        lineHeight: this.parsePixelValue(computedStyle.lineHeight) || 1.2,
        letterSpacing: this.parsePixelValue(computedStyle.letterSpacing) || 0,
        textAlign: computedStyle.textAlign
      };
    }
    captureVisualEffects(computedStyle) {
      return {
        boxShadow: computedStyle.boxShadow,
        borderRadius: this.parsePixelValue(computedStyle.borderRadius) || 0,
        opacity: parseFloat(computedStyle.opacity),
        transform: computedStyle.transform,
        filter: computedStyle.filter
      };
    }
    createMetadata(websiteId, userId, sessionId, components, startTime) {
      var _a;
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
          platform: navigator.platform
        },
        viewportInfo: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
          orientation: window.innerWidth > window.innerHeight ? "landscape" : "portrait"
        },
        performanceMetrics: {
          captureTime: endTime - startTime,
          serializationTime: 0,
          componentCount: components.length,
          totalSize: 0
        },
        pageInfo: {
          url: window.location.href,
          title: document.title,
          lang: document.documentElement.lang || "en",
          charset: document.characterSet,
          viewport: ((_a = document.querySelector('meta[name="viewport"]')) == null ? void 0 : _a.getAttribute("content")) || ""
        },
        componentCounts: {
          total: components.length,
          byType: {},
          interactive: components.filter((c) => c.interactions.isInteractive).length,
          customized: 0
        },
        customizationSummary: {
          totalChanges: 0,
          byType: {},
          aiGenerated: 0,
          userGenerated: 0
        }
      };
    }
    // Additional helper methods would be implemented here...
    parsePixelValue(value) {
      const match = value.match(/^(\d+(?:\.\d+)?)px$/);
      return match && match[1] ? parseFloat(match[1]) : void 0;
    }
    captureComputedStyles(element) {
      const computedStyle = window.getComputedStyle(element);
      const importantStyles = [
        "display",
        "position",
        "width",
        "height",
        "margin",
        "padding",
        "color",
        "backgroundColor",
        "fontSize",
        "fontFamily",
        "border",
        "borderRadius",
        "boxShadow",
        "transform",
        "opacity",
        "zIndex"
      ];
      const styles = {};
      for (const prop of importantStyles) {
        styles[prop] = computedStyle.getPropertyValue(prop);
      }
      return styles;
    }
    detectSemanticRole(element) {
      return element.getAttribute("role") || element.tagName.toLowerCase();
    }
    captureAccessibilityInfo(element) {
      const ariaLevel = element.getAttribute("aria-level");
      const result = {
        role: this.detectSemanticRole(element),
        label: element.getAttribute("aria-label") || element.getAttribute("title") || "",
        description: element.getAttribute("aria-description") || "",
        expanded: element.getAttribute("aria-expanded") === "true",
        selected: element.getAttribute("aria-selected") === "true",
        checked: element.getAttribute("aria-checked") === "true"
      };
      if (ariaLevel) {
        const level = parseInt(ariaLevel);
        if (!isNaN(level)) {
          result.level = level;
        }
      }
      return result;
    }
    createEmptyRelationships() {
      return {
        parent: null,
        children: [],
        siblings: [],
        layoutContainer: null,
        layoutChildren: [],
        labelledBy: null,
        describedBy: null,
        controls: []
      };
    }
    populateRelationships(components, componentMap) {
    }
    isSelectable(element, computedStyle) {
      return computedStyle.userSelect !== "none" && !element.hasAttribute("unselectable");
    }
    isFocusable(element) {
      const tabIndex = element.getAttribute("tabindex");
      return tabIndex !== null && tabIndex !== "-1" || this.isNativelyFocusable(element);
    }
    isNativelyFocusable(element) {
      const focusableElements = /* @__PURE__ */ new Set([
        "a",
        "button",
        "input",
        "textarea",
        "select",
        "area",
        "iframe",
        "object",
        "embed"
      ]);
      return focusableElements.has(element.tagName.toLowerCase()) && !element.hasAttribute("disabled");
    }
    getSupportedEvents(element, tag) {
      const baseEvents = ["click", "mouseenter", "mouseleave"];
      const inputEvents = ["input", "change", "focus", "blur"];
      const inputTags = /* @__PURE__ */ new Set(["input", "textarea", "select"]);
      return inputTags.has(tag) ? [...baseEvents, ...inputEvents] : baseEvents;
    }
    captureInteractionState(element) {
      return {
        hover: false,
        // Would need to track this separately
        focus: document.activeElement === element,
        active: false,
        // Would need to track this separately
        disabled: element.hasAttribute("disabled"),
        selected: element.hasAttribute("aria-selected") && element.getAttribute("aria-selected") === "true"
      };
    }
    getCustomizableProperties(element, computedStyle) {
      const properties = [
        {
          name: "color",
          type: "color",
          currentValue: computedStyle.color
        },
        {
          name: "backgroundColor",
          type: "color",
          currentValue: computedStyle.backgroundColor
        },
        {
          name: "fontSize",
          type: "number",
          currentValue: this.parsePixelValue(computedStyle.fontSize),
          constraints: { min: 8, max: 72 }
        },
        {
          name: "borderRadius",
          type: "number",
          currentValue: this.parsePixelValue(computedStyle.borderRadius),
          constraints: { min: 0, max: 50 }
        }
      ];
      return properties;
    }
    // More helper methods for diff operations, layout detection, etc.
    applyComponentDiff(components, diff) {
    }
    applyStyleDiff(styles, diff) {
    }
    applyLayoutDiff(layout, diff) {
    }
    applyCustomizationDiff(customizations, diff) {
    }
    detectComponentChanges(oldComponent, newComponent) {
      const changes = {};
      return changes;
    }
    extractDesignTokens() {
      return {
        colors: {},
        typography: {},
        spacing: {},
        effects: {}
      };
    }
    extractCustomCSS() {
      return "";
    }
    createEmptyVisualState() {
      return {
        isVisible: false,
        isHidden: false,
        opacity: 1,
        position: {
          x: 0,
          y: 0,
          z: 0,
          type: "static"
        },
        dimensions: {
          width: 0,
          height: 0
        },
        colors: {
          primary: "",
          secondary: "",
          background: "",
          text: "",
          border: "",
          accent: ""
        },
        typography: {
          fontFamily: "",
          fontSize: 16,
          fontWeight: 400,
          lineHeight: 1.2,
          letterSpacing: 0,
          textAlign: "left"
        },
        effects: {
          boxShadow: "",
          borderRadius: 0,
          opacity: 1,
          transform: "none",
          filter: "none"
        }
      };
    }
    createEmptyInteractionCapabilities() {
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
          selected: false
        },
        customizableProperties: [],
        constraints: {
          disabled: false,
          required: false,
          pattern: "",
          minLength: 0,
          maxLength: 0,
          min: 0,
          max: 0,
          step: 1
        }
      };
    }
    createEmptyBoundingRect() {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      };
    }
    createEmptyAccessibilityInfo() {
      return {
        role: "",
        label: "",
        description: "",
        level: 0,
        expanded: false,
        selected: false,
        checked: false
      };
    }
    parseRuleProperties(style) {
      const props = {};
      for (let i = 0; i < style.length; i++) {
        const prop = style.item(i);
        if (prop) {
          props[prop] = style.getPropertyValue(prop);
        }
      }
      return props;
    }
    calculateSpecificity(selector) {
      return selector.split(" ").length;
    }
    determineStyleSource(sheet) {
      if (!sheet.href) return "internal";
      if (sheet.href.startsWith(window.location.origin)) return "internal";
      return "external";
    }
    getMediaQuery(rule) {
      return void 0;
    }
    capturePseudoStates(element) {
      return {};
    }
    detectMainLayoutType(root) {
      const computedStyle = window.getComputedStyle(root);
      return computedStyle.display || "flow";
    }
    isLayoutContainer(component) {
      const layoutDisplays = /* @__PURE__ */ new Set(["flex", "grid", "table"]);
      return Object.values(component.element.styles).some(
        (value) => layoutDisplays.has(value) || value.includes("flex") || value.includes("grid")
      );
    }
    detectContainerType(computedStyle) {
      if (computedStyle.display.includes("flex")) return "flex";
      if (computedStyle.display.includes("grid")) return "grid";
      if (computedStyle.position !== "static") return "positioned";
      return "block";
    }
    captureLayoutProperties(computedStyle) {
      return {
        display: computedStyle.display,
        flexDirection: computedStyle.flexDirection,
        flexWrap: computedStyle.flexWrap,
        justifyContent: computedStyle.justifyContent,
        alignItems: computedStyle.alignItems,
        gap: computedStyle.gap,
        gridTemplateColumns: computedStyle.gridTemplateColumns,
        gridTemplateRows: computedStyle.gridTemplateRows,
        position: computedStyle.position
      };
    }
    capturePositioningContext(components) {
      return [];
    }
    detectResponsiveBreakpoints() {
      return [];
    }
    captureStackingContext(components) {
      return [];
    }
    createActiveContext(components) {
      return {
        activeSelection: null,
        customizationMode: "visual",
        availableActions: [],
        constraints: {
          readonly: false
        }
      };
    }
    createCustomizationMetadata(patches) {
      const now = Date.now();
      return {
        created: now,
        lastModified: now,
        version: 1,
        flags: [],
        tags: []
      };
    }
    mapPatchToCustomizationType(op) {
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
    extractChangesFromPatch(patch) {
      return [];
    }
    /**
     * Captures layout context that helps understand element relationships
     * and layout dependencies for safer patch operations
     */
    captureLayoutContext(domElement, element) {
      const computedStyle = window.getComputedStyle(domElement);
      const parent = domElement.parentElement;
      const parentComputedStyle = parent ? window.getComputedStyle(parent) : null;
      const context = {
        display: computedStyle.display,
        position: computedStyle.position,
        parentDisplay: (parentComputedStyle == null ? void 0 : parentComputedStyle.display) || "block",
        isGridChild: (parentComputedStyle == null ? void 0 : parentComputedStyle.display.includes("grid")) || false,
        isFlexChild: (parentComputedStyle == null ? void 0 : parentComputedStyle.display.includes("flex")) || false,
        isLayoutContainer: this.isElementLayoutContainer(computedStyle),
        layoutRole: this.detectLayoutRole(domElement, computedStyle),
        gridArea: computedStyle.gridArea !== "auto" ? computedStyle.gridArea : void 0,
        flexGrow: computedStyle.flexGrow !== "0" ? computedStyle.flexGrow : void 0,
        flexShrink: computedStyle.flexShrink !== "1" ? computedStyle.flexShrink : void 0,
        flexBasis: computedStyle.flexBasis !== "auto" ? computedStyle.flexBasis : void 0
      };
      if (context.layoutRole === "sidebar" || element.attributes.id === "sidebar") {
        console.log("[🎯 Layout Context] Sidebar detected:", element.uid, context);
      }
      return context;
    }
    isElementLayoutContainer(computedStyle) {
      const containerDisplays = ["grid", "flex", "table", "table-row", "table-cell"];
      return containerDisplays.some((display) => computedStyle.display.includes(display));
    }
    detectLayoutRole(element, computedStyle) {
      const classes = (element.className || "").toString().toLowerCase();
      if (classes.includes("sidebar") || classes.includes("aside")) return "sidebar";
      if (classes.includes("navbar") || classes.includes("header")) return "navbar";
      if (classes.includes("footer")) return "footer";
      if (classes.includes("main") || classes.includes("content")) return "main-content";
      if (classes.includes("container") || classes.includes("wrapper")) return "container";
      if (classes.includes("grid") && computedStyle.display.includes("grid")) return "grid-container";
      if (classes.includes("flex") && computedStyle.display.includes("flex")) return "flex-container";
      const tagName = element.tagName.toLowerCase();
      if (tagName === "aside") return "sidebar";
      if (tagName === "nav") return "navbar";
      if (tagName === "header") return "header";
      if (tagName === "footer") return "footer";
      if (tagName === "main") return "main-content";
      return "unknown";
    }
  }
  function createWebsiteSerializer(config) {
    return new WebsiteSerializer(config);
  }
  class SnapshotAPI {
    constructor(config) {
      this.config = {
        baseUrl: config.baseUrl.replace(/\/$/, ""),
        // Remove trailing slash
        apiKey: config.apiKey || "",
        websiteKey: config.websiteKey || "",
        timeout: config.timeout || 1e4
      };
    }
    async hasSnapshot(websiteId) {
      try {
        const response = await this.makeRequest(
          `/api/snapshots/exists?website_id=${encodeURIComponent(websiteId)}`,
          { method: "GET" }
        );
        if (!response.ok) return false;
        const data = await response.json();
        return data.exists === true;
      } catch {
        return false;
      }
    }
    async createSnapshot(snapshot) {
      var _a, _b, _c, _d, _e, _f;
      console.log("[SnapshotAPI DEBUG] createSnapshot called with:", snapshot);
      try {
        const apiPayload = {
          website_id: snapshot.metadata.websiteId,
          session_id: snapshot.metadata.sessionId,
          version: snapshot.metadata.version,
          components: snapshot.components,
          styles: snapshot.styles,
          layout: snapshot.layout,
          customizations: snapshot.userCustomizations,
          // rename userCustomizations -> customizations
          metadata: snapshot.metadata,
          // Prompt context fields (flatten from promptContext if present)
          prompt_text: ((_a = snapshot.promptContext) == null ? void 0 : _a.promptText) || "",
          prompt_type: ((_b = snapshot.promptContext) == null ? void 0 : _b.promptType) || "",
          selected_element_uid: ((_c = snapshot.promptContext) == null ? void 0 : _c.selectedElementUID) || "",
          page_url: ((_d = snapshot.promptContext) == null ? void 0 : _d.pageUrl) || "",
          user_agent: ((_e = snapshot.promptContext) == null ? void 0 : _e.userAgent) || "",
          trigger_type: ((_f = snapshot.promptContext) == null ? void 0 : _f.triggerType) || "manual"
        };
        console.log("[SnapshotAPI DEBUG] Transformed payload:", apiPayload);
        console.log("[SnapshotAPI DEBUG] Making request to:", `${this.config.baseUrl}/api/snapshots`);
        const response = await this.makeRequest("/api/snapshots", {
          method: "POST",
          body: JSON.stringify(apiPayload)
        });
        console.log("[SnapshotAPI DEBUG] Response received:", {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[SnapshotAPI DEBUG] Request failed:", errorData);
          return {
            success: false,
            error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
          };
        }
        const data = await response.json();
        console.log("[SnapshotAPI DEBUG] Success response data:", data);
        return {
          success: true,
          snapshotId: data.id
        };
      } catch (error) {
        console.error("[SnapshotAPI DEBUG] Request error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Network error"
        };
      }
    }
    async createDiff(diff) {
      try {
        const response = await this.makeRequest("/api/snapshots/diff", {
          method: "POST",
          body: JSON.stringify(diff)
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
          };
        }
        const data = await response.json();
        return {
          success: true,
          snapshotId: data.id
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Network error"
        };
      }
    }
    async generateEmbeddings(snapshotId) {
      try {
        const response = await this.makeRequest(`/api/snapshots/${snapshotId}/embeddings`, {
          method: "POST"
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
          };
        }
        const data = await response.json();
        return {
          success: true,
          embeddingId: data.embeddingId
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Network error"
        };
      }
    }
    async makeRequest(endpoint, options) {
      const url = `${this.config.baseUrl}${endpoint}`;
      const headers = new Headers(options.headers);
      headers.set("Content-Type", "application/json");
      if (this.config.apiKey) {
        headers.set("Authorization", `Bearer ${this.config.apiKey}`);
      }
      if (this.config.websiteKey) {
        headers.set("X-Website-Key", this.config.websiteKey);
      }
      headers.set("X-Browser-Fingerprint", getFingerprint());
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }
  }
  function generateWebsiteId() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    return `${hostname}${pathname === "/" ? "" : pathname}`;
  }
  function generateUserId() {
    const sources = [
      // Check our own stored user ID first
      () => localStorage.getItem("kuttl_user_id"),
      // Common user ID storage locations
      () => localStorage.getItem("userId"),
      () => localStorage.getItem("user_id"),
      () => sessionStorage.getItem("userId"),
      () => sessionStorage.getItem("user_id"),
      // Try to get from common auth tokens
      () => {
        try {
          const token = localStorage.getItem("token") || localStorage.getItem("authToken");
          if (token && token.includes(".")) {
            const parts = token.split(".");
            if (parts.length >= 2 && parts[1]) {
              const payload = JSON.parse(atob(parts[1]));
              return payload.sub || payload.userId || payload.id;
            }
          }
        } catch (e) {
        }
        return null;
      },
      // Generate anonymous ID and persist it
      () => {
        const anonymousId = "anon_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
        localStorage.setItem("kuttl_user_id", anonymousId);
        return anonymousId;
      }
    ];
    for (const source of sources) {
      const id = source();
      if (id) return id;
    }
    return "anonymous";
  }
  function init$1(userConfig = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    console.log("[InterceptJS DEBUG] Raw userConfig received:", userConfig);
    const config = resolveConfig(userConfig);
    console.log("[InterceptJS DEBUG] Resolved config:", config);
    const sourceSnapshot = Object.freeze(
      captureTree(config.root, {
        uidAttribute: config.uidAttribute,
        skipTags: config.skipTags
      })
    );
    let workingTree = deepClone(sourceSnapshot);
    const store = createPatchStore();
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
    const aiLayer = createAILayer(config.websiteKey ?? void 0, (_b = (_a = config.snapshot) == null ? void 0 : _a.api) == null ? void 0 : _b.baseUrl);
    const serializer = createWebsiteSerializer({
      uidAttribute: config.uidAttribute,
      descriptionAttribute: config.descriptionAttribute
    });
    let snapshotAPI = null;
    let lastSnapshotTime = 0;
    const websiteId = ((_c = config.snapshot) == null ? void 0 : _c.websiteId) || generateWebsiteId();
    const userId = ((_d = config.snapshot) == null ? void 0 : _d.userId) || generateUserId();
    console.log("[InterceptJS DEBUG] Snapshot config check:", {
      enabled: (_e = config.snapshot) == null ? void 0 : _e.enabled,
      hasApi: !!((_f = config.snapshot) == null ? void 0 : _f.api),
      websiteId,
      userId
    });
    if (((_g = config.snapshot) == null ? void 0 : _g.enabled) && ((_h = config.snapshot) == null ? void 0 : _h.api)) {
      console.log("[InterceptJS DEBUG] Creating SnapshotAPI instance");
      snapshotAPI = new SnapshotAPI({
        ...config.snapshot.api,
        ...config.websiteKey ? { websiteKey: config.websiteKey } : {}
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
        enabled: (_i = config.snapshot) == null ? void 0 : _i.enabled,
        hasApi: !!((_j = config.snapshot) == null ? void 0 : _j.api)
      });
    }
    let currentSelection = null;
    const selector = createSelector(config.root, {
      uidAttribute: config.uidAttribute,
      descriptionAttribute: config.descriptionAttribute,
      onSelect: (el) => {
        currentSelection = el;
        if (config.onSelect) config.onSelect(el);
      }
    });
    const undoStack = [];
    async function createAndSendSnapshot(force = false, promptContext) {
      var _a2, _b2, _c2;
      console.log("[InterceptJS DEBUG] createAndSendSnapshot called:", {
        force,
        hasSnapshotAPI: !!snapshotAPI,
        snapshotEnabled: (_a2 = config.snapshot) == null ? void 0 : _a2.enabled
      });
      if (!snapshotAPI || !((_b2 = config.snapshot) == null ? void 0 : _b2.enabled)) {
        console.log("[InterceptJS DEBUG] Snapshot creation aborted:", {
          snapshotAPI: !!snapshotAPI,
          enabled: (_c2 = config.snapshot) == null ? void 0 : _c2.enabled
        });
        return;
      }
      if (await snapshotAPI.hasSnapshot(websiteId)) {
        if (config.debug) console.log("[InterceptJS] Snapshot already exists for this website — skipping.");
        return;
      }
      const now = Date.now();
      const throttleMs = config.snapshot.throttleMs || 5e3;
      if (!force && now - lastSnapshotTime < throttleMs) {
        if (config.debug) {
          console.log("[InterceptJS] Snapshot throttled, skipping");
        }
        return;
      }
      try {
        const autoPromptContext = promptContext || {
          promptText: "",
          promptType: "manual_change",
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          triggerType: force ? "auto_sync" : "manual"
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
        } else {
          console.warn("[InterceptJS] Snapshot creation failed:", result.error);
        }
      } catch (error) {
        console.warn("[InterceptJS] Snapshot creation error:", error);
      }
    }
    function countNodes(node) {
      if (node.nodeType === "text") return 1;
      return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
    }
    async function addLayoutContextToTree(tree, domRoot) {
      const enhancedTree = deepClone(tree);
      function addLayoutContextToNode(node) {
        if (node.nodeType === "element") {
          const elementNode = node;
          const domElement = domRoot.querySelector(`[${config.uidAttribute}="${elementNode.uid}"]`);
          if (domElement) {
            const computedStyle = window.getComputedStyle(domElement);
            const parent = domElement.parentElement;
            const parentComputedStyle = parent ? window.getComputedStyle(parent) : null;
            elementNode.layoutContext = {
              display: computedStyle.display,
              position: computedStyle.position,
              parentDisplay: (parentComputedStyle == null ? void 0 : parentComputedStyle.display) || "block",
              isGridChild: (parentComputedStyle == null ? void 0 : parentComputedStyle.display.includes("grid")) || false,
              isFlexChild: (parentComputedStyle == null ? void 0 : parentComputedStyle.display.includes("flex")) || false,
              isLayoutContainer: ["grid", "flex", "table"].some((display) => computedStyle.display.includes(display)),
              layoutRole: detectLayoutRole(domElement),
              gridArea: computedStyle.gridArea !== "auto" ? computedStyle.gridArea : void 0,
              flexGrow: computedStyle.flexGrow !== "0" ? computedStyle.flexGrow : void 0,
              flexShrink: computedStyle.flexShrink !== "1" ? computedStyle.flexShrink : void 0,
              flexBasis: computedStyle.flexBasis !== "auto" ? computedStyle.flexBasis : void 0
            };
            if (elementNode.layoutContext.layoutRole === "sidebar") {
              console.log("[🎯 Enhanced Tree] Added layout context to sidebar:", elementNode.uid, elementNode.layoutContext);
            }
          }
          elementNode.children.forEach(addLayoutContextToNode);
        }
      }
      addLayoutContextToNode(enhancedTree);
      return enhancedTree;
    }
    function detectLayoutRole(element) {
      const classes = (element.className || "").toString().toLowerCase();
      if (classes.includes("sidebar") || classes.includes("aside")) return "sidebar";
      if (classes.includes("navbar") || classes.includes("header")) return "navbar";
      if (classes.includes("footer")) return "footer";
      if (classes.includes("modal") || classes.includes("dialog")) return "modal";
      if (classes.includes("main") || classes.includes("content")) return "main";
      return "unknown";
    }
    async function applyAndReconcile(_patches) {
      var _a2;
      const old = workingTree;
      if (config.debug) {
        console.log("[InterceptJS] 🔍 About to apply patches:", _patches);
        console.log("[InterceptJS] 🌳 Current tree has", countNodes(sourceSnapshot), "nodes");
      }
      let enhancedSnapshot = sourceSnapshot;
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
      if (_patches.length > 0 && ((_a2 = config.snapshot) == null ? void 0 : _a2.onChanges) !== false) {
        createAndSendSnapshot().catch((error) => {
          if (config.debug) {
            console.warn("[InterceptJS] Auto-snapshot on changes failed:", error);
          }
        });
      }
      return { warnings };
    }
    const instance = {
      get store() {
        return store;
      },
      get sourceSnapshot() {
        return sourceSnapshot;
      },
      get selection() {
        return currentSelection;
      },
      async patch(input) {
        const patches = Array.isArray(input) ? input : [input];
        for (const p of patches) {
          const patch = {
            ...p,
            id: p.id ?? generatePatchId(),
            timestamp: p.timestamp ?? Date.now()
          };
          store.add(patch);
          undoStack.push(patch.id);
        }
        return await applyAndReconcile(patches);
      },
      async unpatch(patchId) {
        const removed = store.remove(patchId);
        if (removed) await applyAndReconcile([]);
        return removed;
      },
      async undo() {
        const lastId = undoStack.pop();
        if (!lastId) return false;
        const removed = store.remove(lastId);
        if (removed) await applyAndReconcile([]);
        return removed;
      },
      reset() {
        store.clear();
        undoStack.length = 0;
        const old = workingTree;
        workingTree = deepClone(sourceSnapshot);
        reconcile(old, workingTree, config.debug);
        persist(config, store, config.root);
      },
      preview(patches) {
        const patchArray = Array.isArray(patches) ? patches : [patches];
        return previewPatches(workingTree, patchArray, config.root);
      },
      generateSemanticPatches(operation, targetUid) {
        return generateSemanticPatches(workingTree, operation, targetUid, config.root);
      },
      export() {
        return store.serialize();
      },
      async import(json) {
        store.hydrate(json);
        await applyAndReconcile([]);
      },
      async prompt(userPrompt) {
        var _a2;
        if (!aiLayer) {
          throw new Error(
            "[InterceptJS] prompt() called but no AI config was provided at init(). Pass an `ai` config object with provider and apiKey."
          );
        }
        let enhancedTree = workingTree;
        try {
          console.log("[🔧 AI Enhancement] Creating enhanced tree with layout context...");
          enhancedTree = await addLayoutContextToTree(workingTree, config.root);
          console.log("[🔧 AI Enhancement] Enhanced tree created with", countNodes(enhancedTree), "nodes");
        } catch (error) {
          console.warn("[🔧 AI Enhancement] Failed to create enhanced tree, using basic tree:", error);
        }
        const { result, status } = await aiLayer.prompt(
          userPrompt,
          enhancedTree,
          // Send enhanced tree instead of basic workingTree
          config.descriptionAttribute,
          currentSelection,
          // passes selected element as context
          websiteId
          // passes website ID for embedding context
        );
        if (result.patches.length > 0) {
          for (const patch of result.patches) {
            store.add(patch);
            undoStack.push(patch.id);
          }
          await applyAndReconcile(result.patches);
        }
        const promptContext = {
          promptText: userPrompt,
          promptType: "ai_modification",
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          triggerType: "ai_prompt",
          metadata: {
            patchesApplied: result.patches.length,
            warnings: result.warnings.length,
            status
          },
          ...(currentSelection == null ? void 0 : currentSelection.uid) && { selectedElementUID: currentSelection.uid }
        };
        if ((_a2 = config.snapshot) == null ? void 0 : _a2.enabled) {
          createAndSendSnapshot(true, promptContext).catch((error) => {
            if (config.debug) {
              console.warn("[InterceptJS] AI prompt snapshot failed:", error);
            }
          });
        }
        if (config.debug) {
          console.group("[InterceptJS] AI prompt");
          console.log("Prompt:", userPrompt);
          console.log("Selected element:", (currentSelection == null ? void 0 : currentSelection.uid) ?? "none");
          console.log("Status:", status);
          console.log("Patches applied:", result.patches.length);
          if (result.warnings.length) console.warn("Warnings:", result.warnings);
          console.log("Raw:", result.raw);
          console.groupEnd();
        }
        return { result, status };
      },
      toggleSelect() {
        if (selector.isEnabled()) {
          selector.disable();
          return false;
        } else {
          selector.enable();
          return true;
        }
      },
      clearSelection() {
        currentSelection = null;
        if (config.onSelect) config.onSelect(null);
      },
      // ─────────────────────────────────────────────
      // Website Serialization Methods
      // ─────────────────────────────────────────────
      createSnapshot(websiteId2, userId2, sessionId, promptContext) {
        return serializer.createSnapshot(
          workingTree,
          store.getAll(),
          config.root,
          websiteId2,
          userId2,
          sessionId || generatePatchId(),
          promptContext
        );
      },
      createDiff() {
        const currentSnapshot = this.createSnapshot("temp", "temp");
        return serializer.createDiff(currentSnapshot);
      },
      applyDiff(diff) {
        if (config.debug) {
          console.log("[InterceptJS] Applying snapshot diff:", diff);
        }
      },
      get lastSnapshot() {
        return serializer["lastSnapshot"];
      }
    };
    console.log("[InterceptJS DEBUG] Checking if initial snapshot should be created:", {
      enabled: (_k = config.snapshot) == null ? void 0 : _k.enabled
    });
    if ((_l = config.snapshot) == null ? void 0 : _l.enabled) {
      console.log("[InterceptJS DEBUG] Scheduling initial snapshot in 100ms");
      setTimeout(() => {
        console.log("[InterceptJS DEBUG] Initial snapshot timeout fired - calling createAndSendSnapshot");
        createAndSendSnapshot(true).catch((error) => {
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
  function resolveConfig(config) {
    var _a, _b, _c, _d, _e, _f;
    return {
      root: config.root ?? document.body,
      uidAttribute: config.uidAttribute ?? "data-uid",
      descriptionAttribute: config.descriptionAttribute ?? "data-description",
      skipTags: config.skipTags ?? [],
      persistKey: config.persistKey ?? null,
      debug: config.debug ?? false,
      ai: config.ai ?? null,
      websiteKey: config.websiteKey ?? null,
      onSelect: config.onSelect ?? null,
      snapshot: {
        enabled: ((_a = config.snapshot) == null ? void 0 : _a.enabled) ?? false,
        api: ((_b = config.snapshot) == null ? void 0 : _b.api) ?? null,
        ...((_c = config.snapshot) == null ? void 0 : _c.websiteId) && { websiteId: config.snapshot.websiteId },
        ...((_d = config.snapshot) == null ? void 0 : _d.userId) && { userId: config.snapshot.userId },
        onChanges: ((_e = config.snapshot) == null ? void 0 : _e.onChanges) ?? true,
        throttleMs: ((_f = config.snapshot) == null ? void 0 : _f.throttleMs) ?? 5e3
      }
    };
  }
  function persistenceKey(prefix, root) {
    const path = window.location.pathname;
    const rootId = root.id ? `#${root.id}` : root.tagName.toLowerCase();
    return `${prefix}:${path}:${rootId}`;
  }
  function persist(config, store, root) {
    if (!config.persistKey) return;
    try {
      localStorage.setItem(persistenceKey(config.persistKey, root), store.serialize());
    } catch (err) {
      if (err instanceof DOMException && err.name === "QuotaExceededError")
        console.warn("[InterceptJS] localStorage quota exceeded.");
    }
  }
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
  const FAB_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8 2 5 5 5 9c0 2 .8 3.8 2 5l-2 4h14l-2-4c1.2-1.2 2-3 2-5 0-4-3-7-7-7z"/><path d="M9 9h.01M15 9h.01"/><path d="M5 14c-1.5.5-3 .3-3-1s1.5-2 3-1.5"/><path d="M19 14c1.5.5 3 .3 3-1s-1.5-2-3-1.5"/></svg>`;
  const EXPAND_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
  const COLLAPSE_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 14h6v6M14 4h6v6M4 20l7-7M20 4l-7 7"/></svg>`;
  const CLOSE_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
  function createCuttlefishUI(intercept, config = {}) {
    if (!document.getElementById("__ctf_styles__")) {
      const style = document.createElement("style");
      style.id = "__ctf_styles__";
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    let panelOpen = false;
    let expanded = false;
    let selectActive = false;
    let activeTab = "patches";
    let promptHistory = [];
    const fab = document.createElement("button");
    fab.id = "ctf-fab";
    fab.innerHTML = FAB_SVG;
    fab.title = "Kuttl";
    document.body.appendChild(fab);
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
    const q = (sel) => panel.querySelector(sel);
    const promptInput = q("#ctf-prompt-input");
    const statusEl = q("#ctf-prompt-status");
    const sendBtn = q("#ctf-send-btn");
    const selectBtn = q("#ctf-select-btn");
    const undoBtn = q("#ctf-undo-btn");
    const saveBtn = q("#ctf-save-btn");
    const resetBtn = q("#ctf-reset-btn");
    const selBar = q("#ctf-selection-bar");
    const selText = q("#ctf-sel-text");
    const clearSelBtn = q("#ctf-clear-sel");
    const expandBtn = q("#ctf-expand-btn");
    const closeBtn = q("#ctf-close-btn");
    const patchPanel = q("#ctf-tab-patches");
    const promptPanel = q("#ctf-tab-prompts");
    function openPanel() {
      panelOpen = true;
      panel.classList.add("visible");
      fab.classList.add("open");
    }
    function closePanel() {
      console.log("close panel");
      panelOpen = false;
      panel.classList.remove("visible");
      fab.classList.remove("open");
      intercept.clearSelection();
      document.querySelectorAll(".__ctf_pinned__").forEach(
        (el) => el.classList.remove("__ctf_pinned__")
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
      if (panelOpen && !selectActive && !panel.contains(e.target) && !fab.contains(e.target))
        closePanel();
    }, true);
    function setExpanded(val) {
      expanded = val;
      panel.classList.toggle("expanded", expanded);
      expandBtn.innerHTML = expanded ? COLLAPSE_SVG : EXPAND_SVG;
      expandBtn.title = expanded ? "Collapse" : "Expand";
      if (expanded) {
        renderPatchList();
        renderPromptList();
      }
    }
    expandBtn.addEventListener("click", () => setExpanded(!expanded));
    panel.querySelectorAll(".ctf-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        activeTab = tab.dataset["tab"];
        panel.querySelectorAll(".ctf-tab,.ctf-tab-panel").forEach((el) => el.classList.remove("active"));
        tab.classList.add("active");
        q(`#ctf-tab-${activeTab}`).classList.add("active");
      });
    });
    function setStatus(text, cls = "") {
      statusEl.textContent = text;
      statusEl.className = cls;
    }
    async function sendPrompt() {
      const text = promptInput.value.trim();
      if (!text) return;
      sendBtn.disabled = true;
      setStatus("Thinking…", "loading");
      const entry = { text, timestamp: Date.now(), patchCount: 0, error: null };
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
      sendBtn.disabled = false;
      promptInput.value = "";
      if (expanded) renderPromptList();
    }
    sendBtn.addEventListener("click", sendPrompt);
    promptInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sendPrompt();
      }
    });
    function updateSel(el) {
      if (!el) {
        selText.textContent = "No element selected";
        selBar.classList.remove("has");
      } else {
        selText.textContent = `${el.tag}#${el.uid} — ${el.description}`;
        selBar.classList.add("has");
      }
    }
    selectBtn.addEventListener("click", () => {
      if (selectActive) {
        selectActive = false;
        intercept.toggleSelect();
        intercept.clearSelection();
        updateSel(null);
        selectBtn.classList.remove("active");
        selectBtn.textContent = "⊕ Select";
      } else {
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
    setInterval(() => {
      if (selectActive && intercept.selection) {
        updateSel(intercept.selection);
        selectActive = false;
        selectBtn.classList.remove("active");
        selectBtn.textContent = "⊕ Select";
      }
    }, 40);
    undoBtn.addEventListener("click", async () => {
      const ok2 = await intercept.undo();
      setStatus(ok2 ? "✓ Undone" : "Nothing to undo", ok2 ? "ok" : "");
      if (expanded) renderPatchList();
    });
    saveBtn.addEventListener("click", () => {
      const count = JSON.parse(intercept.export()).length;
      setStatus(`✓ Saved ${count} patch(es)`, "ok");
      saveBtn.textContent = "✓ Saved";
      saveBtn.classList.add("saved");
      setTimeout(() => {
        saveBtn.textContent = "↓ Save";
        saveBtn.classList.remove("saved");
      }, 1800);
    });
    resetBtn.addEventListener("click", () => {
      intercept.reset();
      intercept.clearSelection();
      updateSel(null);
      setStatus("Reset to source");
      if (expanded) renderPatchList();
    });
    function renderPatchList() {
      const patches = intercept.store.getAll();
      if (!patches.length) {
        patchPanel.innerHTML = `<div class="ctf-empty">No patches applied yet</div>`;
        return;
      }
      patchPanel.innerHTML = patches.map((p) => `
      <div class="ctf-patch-item">
        <span class="ctf-patch-op">${p.op}</span>
        <span class="ctf-patch-target">${p.target}</span>
        <span class="ctf-patch-src">${p.source}</span>
        <button class="ctf-patch-rm" data-id="${p.id}">✕</button>
      </div>`).join("");
      patchPanel.querySelectorAll(".ctf-patch-rm").forEach(
        (btn) => btn.addEventListener("click", () => {
          intercept.unpatch(btn.dataset["id"]);
          renderPatchList();
        })
      );
    }
    function renderPromptList() {
      if (!promptHistory.length) {
        promptPanel.innerHTML = `<div class="ctf-empty">No prompts sent yet</div>`;
        return;
      }
      promptPanel.innerHTML = promptHistory.map((e) => {
        const time = new Date(e.timestamp).toLocaleTimeString();
        const meta = e.error ? `<span class="err">✕ ${e.error.slice(0, 50)}</span>` : `<span class="ok">✓ ${e.patchCount} patch(es)</span>`;
        return `<div class="ctf-prompt-item">
        <div class="ctf-prompt-text">${e.text}</div>
        <div class="ctf-prompt-meta"><span>${time}</span>${meta}</div>
      </div>`;
      }).join("");
    }
  }
  const API_BASE = "http://localhost:8080";
  const _scriptEl = document.currentScript;
  const _websiteKey = (_scriptEl == null ? void 0 : _scriptEl.getAttribute("data-website-key")) ?? null;
  function init(config = {}) {
    if (!_websiteKey) return;
    const icpConfig = {
      debug: config.debug ?? false
    };
    if (config.root) icpConfig.root = config.root;
    if (_websiteKey) icpConfig.websiteKey = _websiteKey;
    icpConfig.persistKey = config.persistKey ?? `kuttl_${_websiteKey.slice(0, 8)}`;
    const apiBaseUrl = API_BASE;
    const snapshotBase = config.snapshot ?? {};
    const snap = {
      enabled: snapshotBase.enabled ?? true,
      api: { baseUrl: apiBaseUrl, ...snapshotBase.api ?? {} },
      onChanges: snapshotBase.onChanges ?? true,
      throttleMs: snapshotBase.throttleMs ?? 5e3
    };
    if (snapshotBase.websiteId) snap.websiteId = snapshotBase.websiteId;
    if (snapshotBase.userId) snap.userId = snapshotBase.userId;
    icpConfig.snapshot = snap;
    fetch(`${API_BASE}/api/validate`, {
      method: "GET",
      headers: { "X-Website-Key": _websiteKey }
    }).then((res) => {
      if (!res.ok) return;
      const intercept = init$1(icpConfig);
      createCuttlefishUI(intercept, {});
    }).catch(() => {
    });
  }
  exports.init = init;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
})({});
//# sourceMappingURL=cuttlefish.iife.js.map
