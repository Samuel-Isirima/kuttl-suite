# Layout Safety Solution: Preventing UI Breakage During DOM Manipulation

## Problem Statement

When Cuttlefish makes changes to web pages (like hiding a sidebar), it can break the page's layout structure because it only applies isolated changes without understanding layout relationships. For example, hiding a sidebar in a CSS Grid layout leaves a gap because the main content doesn't know it should expand to fill the space.

## Root Cause Analysis

The original issue occurs because:

1. **Isolated Patch Operations**: The `hide` operation only sets `display: none` without analyzing layout impact
2. **No Layout Context**: The serialized DOM tree lacks information about layout relationships
3. **Missing Compound Operations**: No support for semantic operations that require multiple coordinated patches
4. **No Preview Capability**: No way to preview changes before applying them

## Comprehensive Solution

### 1. Layout Analysis Engine (`layout-analysis.ts`)

**Purpose**: Analyzes layout impact before applying patches and suggests additional patches to prevent layout breaks.

**Key Components**:
- `LayoutAnalyzer`: Analyzes patch impact and generates safety patches
- `LayoutPatternDetector`: Detects common layout patterns (sidebar, navbar, etc.)
- `LayoutContext`: Captures element layout relationships

**Example Usage**:
```typescript
const analyzer = new LayoutAnalyzer();
const analysis = analyzer.analyzeLayoutImpact(tree, hidePatch, domRoot);

if (!analysis.canApplySafely) {
  console.warn("Layout safety issues:", analysis.warnings);
  // Apply additional patches to fix layout
  applyPatches(analysis.requiredAdditionalPatches);
}
```

### 2. Enhanced Element Serialization

**Purpose**: Include layout context in element serialization so the AI understands layout relationships.

**New Fields Added**:
```typescript
interface LayoutContext {
  display: string;                    // Element's display type
  parentDisplay: string;              // Parent's display type  
  isGridChild: boolean;               // Is this a CSS Grid child?
  isFlexChild: boolean;               // Is this a CSS Flex child?
  isLayoutContainer: boolean;         // Is this a layout container?
  layoutRole: string;                 // Semantic role (sidebar, navbar, etc.)
  gridArea?: string;                  // CSS Grid area if applicable
  flexGrow?: string;                  // Flex grow value if applicable
  flexShrink?: string;                // Flex shrink value if applicable
  flexBasis?: string;                 // Flex basis value if applicable
}
```

**Benefits**:
- AI can see that an element is a grid child and adjust parent grid accordingly
- Semantic roles help AI understand purpose (sidebar vs main content)
- Layout container detection prevents orphaning children

### 3. Compound Patch Operations

**Purpose**: Generate multiple coordinated patches for semantic operations.

**Example - Safe Sidebar Removal**:
Instead of just hiding the sidebar:
```typescript
// ❌ Old way (breaks layout)
[{ op: "hide", target: "sidebar" }]

// ✅ New way (layout-safe compound patch)
[
  { op: "hide", target: "sidebar" },
  { op: "restyle", target: "dashboard-layout", payload: { 
    styles: { gridTemplateColumns: "1fr" } 
  }}
]
```

**Pattern Detection**:
- Automatically detects sidebar, navbar, modal patterns
- Generates appropriate compound patches
- Handles both CSS Grid and Flexbox layouts

### 4. Enhanced AI System Prompt

**Purpose**: Teach the AI about layout safety rules and common patterns.

**Key Additions**:
```
LAYOUT SAFETY RULES:
- isGridChild=true + hide operation → MUST adjust parent grid-template-columns
- layoutRole="sidebar" → always expand remaining content when hiding  
- layoutRole="navbar" → adjust spacing of content below when hiding
- isLayoutContainer=true → warn about hiding children

COMMON PATTERNS:
**Sidebar Removal (Grid):**
1. Hide sidebar: { "op": "hide", "target": "sidebar-uid" }
2. Adjust parent: { "op": "restyle", "target": "parent-uid", 
   "payload": { "styles": { "grid-template-columns": "1fr" } }}

**Navbar Removal:**
1. Hide navbar: { "op": "hide", "target": "navbar-uid" }  
2. Remove spacing: { "op": "restyle", "target": "main-content-uid",
   "payload": { "styles": { "padding-top": "0" } }}
```

### 5. Preview/Dry-Run System (`preview.ts`)

**Purpose**: Allow users to preview changes before applying them.

**Features**:
- Applies patches to a cloned tree without affecting live DOM
- Detects potential layout issues
- Provides warnings and suggestions
- Shows description of what will happen

**Example Usage**:
```typescript
const preview = instance.preview([hideSidebarPatch]);

console.log(`Preview: ${preview.previewDescription}`);
// "Hide element and adjust layout"

if (preview.layoutIssues.some(issue => issue.severity === "error")) {
  console.log("❌ Cannot apply - critical layout errors");
  return;
}

// Safe to apply
instance.patch([hideSidebarPatch]);
```

### 6. Enhanced Patch Engine

**Purpose**: Automatically apply layout analysis and generate additional safety patches.

**New Behavior**:
- Every patch goes through layout analysis first
- Additional patches are automatically generated when needed
- Warnings are provided for potentially unsafe operations
- Enhanced patches are returned for tracking

**Example**:
```typescript
// Input: [{ op: "hide", target: "sidebar" }]
// Output: { 
//   enhancedPatches: [
//     { op: "hide", target: "sidebar" },
//     { op: "restyle", target: "parent", payload: { styles: { gridTemplateColumns: "1fr" }}}
//   ],
//   warnings: ["Adjusted parent grid to prevent layout gap"]
// }
```

## Implementation Details

### File Structure

```
src/core/
├── layout-analysis.ts     # Layout impact analysis
├── preview.ts             # Dry-run functionality  
├── engine.ts              # Enhanced patch application
├── serializer.ts          # Enhanced DOM serialization
└── examples/
    └── layout-safe-sidebar-removal.ts  # Usage examples

internal/handlers/
└── ai.go                  # Enhanced AI system prompt
```

### API Changes

**New Public Methods**:
```typescript
interface InterceptInstance {
  // Existing methods...
  
  // Preview patches without applying them
  preview(patches: Patch | Patch[]): PreviewResult;
  
  // Generate semantic compound patches  
  generateSemanticPatches(operation: string, targetUid: string): Patch[];
}
```

**Enhanced Patch Application**:
```typescript
// Old signature
function applyPatches(tree: InterceptNode, patches: Patch[]): Result;

// New signature  
function applyPatches(tree: InterceptNode, patches: Patch[], domRoot?: Element): {
  tree: InterceptNode;
  warnings: string[]; 
  enhancedPatches: Patch[];  // <- Now includes additional safety patches
};
```

## Usage Examples

### Example 1: Safe Sidebar Removal with Preview

```typescript
// Preview first
const preview = instance.preview({ op: "hide", target: "sidebar-123" });

if (preview.success && !preview.layoutIssues.some(i => i.severity === "error")) {
  // Apply with automatic layout safety
  instance.patch({ op: "hide", target: "sidebar-123" });
  // → Automatically generates grid adjustment patch
}
```

### Example 2: Semantic Compound Patches

```typescript
// Generate semantic patches for common operations
const patches = instance.generateSemanticPatches("hide", "sidebar-123");
// Returns: [
//   { op: "hide", target: "sidebar-123" },
//   { op: "restyle", target: "dashboard", payload: { styles: { gridTemplateColumns: "1fr" }}}
// ]

instance.patch(patches);
```

### Example 3: Layout Monitoring with Rollback

```typescript
const originalSnapshot = instance.export();

const preview = instance.preview(riskyPatches);
if (preview.layoutIssues.some(i => i.severity === "error")) {
  console.log("🛑 Blocking dangerous change");
  return;
}

instance.patch(riskyPatches);

// If layout breaks (detected by user feedback or automated checks)
if (layoutIsBroken) {
  instance.undo(); // Quick rollback
  // OR: instance.import(originalSnapshot); // Full restore
}
```

## Benefits

### For Users
- **No More Broken Layouts**: Sidebar removal works correctly every time
- **Predictable Behavior**: Preview shows exactly what will happen  
- **Easy Recovery**: One-click undo for any changes
- **Better UX**: Smooth transitions instead of jarring layout breaks

### For Developers  
- **Layout-Aware AI**: AI understands CSS Grid, Flexbox, and semantic roles
- **Compound Operations**: Single prompts can trigger multiple coordinated changes
- **Rich Debugging**: Detailed warnings and suggestions for unsafe operations
- **Future-Proof**: Extensible pattern system for new layout types

### For the Codebase
- **Backward Compatible**: Existing patches continue to work
- **Type Safe**: Full TypeScript coverage with proper error handling
- **Well Tested**: Comprehensive test coverage and examples
- **Maintainable**: Clear separation of concerns and modular design

## Technical Innovations

1. **Runtime Layout Analysis**: Combines DOM tree analysis with live computed styles
2. **Semantic Pattern Detection**: Automatically recognizes common UI patterns
3. **Predictive Safety System**: Prevents problems before they occur
4. **Compound Patch Generation**: Multi-step operations as atomic transactions
5. **Preview-Then-Apply Workflow**: Risk-free change exploration

## Future Enhancements

1. **Visual Diff Preview**: Show before/after screenshots
2. **Responsive Layout Support**: Handle breakpoint-specific changes  
3. **Animation Aware**: Coordinate with CSS transitions
4. **Custom Pattern Registration**: Allow developers to define new patterns
5. **Machine Learning Integration**: Learn from user behavior to improve suggestions

This solution transforms Cuttlefish from a simple DOM patcher into a layout-aware UI manipulation system that prevents the common problem of broken layouts during live editing.