// Example: Layout-Safe Sidebar Removal
// This demonstrates how the new layout analysis prevents breaking page structure

import { init } from "../index";
import type { LayoutIssue } from "../core/preview";

// Initialize InterceptJS with layout safety features
const instance = init({
  root: document.body,
  debug: true,
  snapshot: {
    enabled: true,
    api: {
      baseUrl: "http://localhost:3001/api/snapshots",
    },
    websiteId: "demo-site",
    userId: "user123",
    onChanges: true,
  }
});

// Example 1: Safe Sidebar Removal (Grid Layout)
function removeSidebarSafely() {
  console.log("=== Example 1: Safe Sidebar Removal (Grid) ===");
  
  // Find sidebar element
  const sidebarElement = document.querySelector('.sidebar, aside, [class*="sidebar"]');
  if (!sidebarElement) {
    console.log("No sidebar found");
    return;
  }
  
  const sidebarUid = sidebarElement.getAttribute('data-uid');
  if (!sidebarUid) {
    console.log("Sidebar has no data-uid");
    return;
  }
  
  // Preview what will happen
  const hidePatches = [{
    id: "hide-sidebar",
    target: sidebarUid,
    timestamp: Date.now(),
    source: "user" as const,
    op: "hide" as const,
    payload: {}
  }];
  
  const preview = instance.preview(hidePatches);
  console.log("Preview result:", preview);
  
  if (preview.layoutIssues.length > 0) {
    console.log("⚠️ Layout issues detected:");
    preview.layoutIssues.forEach((issue: LayoutIssue) => {
      console.log(`- ${issue.severity}: ${issue.message}`);
      if (issue.suggestedFix) {
        console.log(`  Suggested fix: ${issue.suggestedFix}`);
      }
    });
  }
  
  // Generate semantic patches that handle layout properly
  const semanticPatches = instance.generateSemanticPatches("hide", sidebarUid);
  console.log("Generated semantic patches:", semanticPatches);
  
  if (semanticPatches.length > 0) {
    console.log("✅ Applying layout-safe semantic patches");
    const result = instance.patch(semanticPatches);
    console.log("Apply result:", result);
  } else {
    console.log("⚠️ Falling back to basic hide (may break layout)");
    const result = instance.patch(hidePatches);
    console.log("Apply result:", result);
  }
}

// Example 2: Preview Before Apply Pattern
function previewThenApply() {
  console.log("\n=== Example 2: Preview-Then-Apply Pattern ===");
  
  const targetElement = document.querySelector('.some-element');
  if (!targetElement) return;
  
  const targetUid = targetElement.getAttribute('data-uid');
  if (!targetUid) return;
  
  const patches = [{
    id: "test-hide",
    target: targetUid,
    timestamp: Date.now(),
    source: "user" as const,
    op: "hide" as const,
    payload: {}
  }];
  
  // Always preview first
  const preview = instance.preview(patches);
  
  if (!preview.success) {
    console.log("❌ Preview failed:", preview.warnings);
    return;
  }
  
  console.log(`📋 Preview: ${preview.previewDescription}`);
  
  // Check for layout issues
  const hasErrors = preview.layoutIssues.some((issue: LayoutIssue) => issue.severity === "error");
  const hasWarnings = preview.layoutIssues.some((issue: LayoutIssue) => issue.severity === "warning");
  
  if (hasErrors) {
    console.log("❌ Cannot apply - critical layout errors detected");
    return;
  }
  
  if (hasWarnings) {
    console.log("⚠️ Layout warnings detected:");
    preview.layoutIssues.forEach((issue: LayoutIssue) => {
      console.log(`  ${issue.message}`);
    });
    
    // In a real app, you might show a confirmation dialog here
    const proceed = confirm("Apply changes despite layout warnings?");
    if (!proceed) return;
  }
  
  // Apply the patches (enhanced with automatic layout fixes)
  console.log("✅ Applying patches with layout safety");
  instance.patch(patches);
}

// Example 3: Compound Patch for Complex Layouts
function handleComplexLayoutChange() {
  console.log("\n=== Example 3: Compound Patches for Complex Layouts ===");
  
  // This simulates hiding a sidebar in a complex dashboard layout
  const sidebarUid = "sidebar-123";
  const mainContentUid = "main-content-456";
  const headerUid = "header-789";
  
  // Manual compound patch - this is what the AI would generate
  const compoundPatches = [
    // 1. Hide the sidebar
    {
      id: "remove-sidebar-1",
      target: sidebarUid,
      timestamp: Date.now(),
      source: "ai" as const,
      op: "hide" as const,
      payload: {}
    },
    // 2. Adjust the grid container to remove the sidebar column
    {
      id: "remove-sidebar-2", 
      target: "dashboard-container",
      timestamp: Date.now(),
      source: "ai" as const,
      op: "restyle" as const,
      payload: {
        styles: {
          gridTemplateColumns: "1fr" // Remove sidebar column, keep main content
        }
      }
    },
    // 3. Optionally adjust main content padding/margins
    {
      id: "remove-sidebar-3",
      target: mainContentUid,
      timestamp: Date.now(), 
      source: "ai" as const,
      op: "restyle" as const,
      payload: {
        styles: {
          paddingLeft: "20px" // Add some padding since sidebar gap is gone
        }
      }
    }
  ];
  
  // Preview the compound operation
  const preview = instance.preview(compoundPatches);
  console.log("Compound patch preview:", preview.previewDescription);
  console.log("Layout issues:", preview.layoutIssues);
  
  // Apply if safe
  if (preview.success && !preview.layoutIssues.some((i: LayoutIssue) => i.severity === "error")) {
    console.log("✅ Applying compound patches");
    instance.patch(compoundPatches);
  }
}

// Example 4: Monitoring and Recovery
function setupLayoutMonitoring() {
  console.log("\n=== Example 4: Layout Monitoring & Recovery ===");
  
  // Store original state for recovery
  const originalSnapshot = instance.export();
  
  // Apply a potentially dangerous change
  const riskyPatches = [{
    id: "risky-change",
    target: "layout-container", 
    timestamp: Date.now(),
    source: "user" as const,
    op: "restyle" as const,
    payload: {
      styles: {
        display: "none" // This will hide the entire layout container!
      }
    }
  }];
  
  // Monitor for layout breakage
  const preview = instance.preview(riskyPatches);
  const criticalIssues = preview.layoutIssues.filter((i: LayoutIssue) => i.severity === "error");
  
  if (criticalIssues.length > 0) {
    console.log("💥 Critical layout issues detected:");
    criticalIssues.forEach((issue: LayoutIssue) => {
      console.log(`  ${issue.message}`);
    });
    
    console.log("🛑 Blocking dangerous change");
    return;
  }
  
  // Apply the change
  console.log("⚠️ Applying risky change with monitoring");
  instance.patch(riskyPatches);
  
  // Simulate detecting broken layout (in real app, this might be user feedback)
  const layoutIsBroken = true;
  
  if (layoutIsBroken) {
    console.log("🚨 Layout breakage detected! Rolling back...");
    
    // Quick rollback method 1: Undo last change
    instance.undo();
    console.log("✅ Rolled back using undo()");
    
    // Alternative rollback method 2: Full restore from snapshot
    // instance.reset();
    // instance.import(originalSnapshot);
    // console.log("✅ Restored from snapshot");
  }
}

// Initialize examples when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      removeSidebarSafely();
      previewThenApply();
      handleComplexLayoutChange();
      setupLayoutMonitoring();
    }, 1000);
  });
} else {
  setTimeout(() => {
    removeSidebarSafely();
    previewThenApply();
    handleComplexLayoutChange();
    setupLayoutMonitoring();
  }, 1000);
}

// Export for manual testing
export {
  removeSidebarSafely,
  previewThenApply,
  handleComplexLayoutChange,
  setupLayoutMonitoring
};