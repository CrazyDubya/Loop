# Loop Studio: Main Workspace Screen Specification

Implementation-ready specification for the primary editing interface.

---

## Screen Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (48px)                                                                  │
├─────────────┬──────────────────────────────────────────────────────────────────┤
│             │                                                                  │
│  SIDEBAR    │                      GRAPH CANVAS                                │
│  (240px)    │                      (flex: 1)                                   │
│             │                                                                  │
│             │                                                                  │
│             ├────────────────────────────────┬─────────────────────────────────┤
│             │      LOOP INSPECTOR            │    NARRATIVE PANEL              │
│             │      (50%)                     │    (50%)                        │
│             │      (280px height)            │    (280px height)               │
├─────────────┴────────────────────────────────┴─────────────────────────────────┤
│ STATUS BAR (32px)                                                              │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Layout Specification

### Container
```css
.workspace {
  display: grid;
  grid-template-rows: 48px 1fr 32px;
  grid-template-columns: 240px 1fr;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
```

### Grid Areas
| Area | Grid Position | Min Size | Max Size | Resize |
|------|---------------|----------|----------|--------|
| Header | row 1, col 1-2 | 48px | 48px | No |
| Sidebar | row 2, col 1 | 200px | 360px | Yes (drag) |
| Main | row 2, col 2 | 400px | - | Flex |
| Status | row 3, col 1-2 | 32px | 32px | No |

### Main Area Split
```css
.main-area {
  display: flex;
  flex-direction: column;
}

.graph-canvas {
  flex: 1;
  min-height: 300px;
}

.bottom-panels {
  height: 280px;          /* Default */
  min-height: 120px;
  max-height: 50vh;
  display: flex;
  gap: 1px;               /* Divider line */
  resize: vertical;       /* Drag handle at top */
}
```

---

## 2. Color Tokens

### Light Theme
```typescript
const lightTheme = {
  // Backgrounds
  bg: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    canvas: '#FAFBFC',
    elevated: '#FFFFFF',
  },

  // Borders
  border: {
    subtle: '#E2E8F0',
    default: '#CBD5E1',
    strong: '#94A3B8',
  },

  // Text
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    inverse: '#FFFFFF',
  },

  // Accent
  accent: {
    primary: '#3B82F6',      // Blue-500
    primaryHover: '#2563EB', // Blue-600
    success: '#22C55E',      // Green-500
    warning: '#F59E0B',      // Amber-500
    error: '#EF4444',        // Red-500
  },

  // Node Types (for graph)
  node: {
    event: '#3B82F6',        // Blue
    decision: '#F59E0B',     // Amber
    location: '#22C55E',     // Green
    encounter: '#8B5CF6',    // Violet
    discovery: '#06B6D4',    // Cyan
    death: '#EF4444',        // Red
    reset: '#EC4899',        // Pink
  },

  // Status
  status: {
    valid: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  }
};
```

### Dark Theme
```typescript
const darkTheme = {
  bg: {
    primary: '#0F172A',
    secondary: '#1E293B',
    tertiary: '#334155',
    canvas: '#1A1F2E',
    elevated: '#1E293B',
  },
  border: {
    subtle: '#334155',
    default: '#475569',
    strong: '#64748B',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    tertiary: '#64748B',
    inverse: '#0F172A',
  },
  // accent and node colors same as light
};
```

---

## 3. Component Hierarchy

```
<Workspace>
├── <Header>
│   ├── <Logo />
│   ├── <ProjectTitle editable />
│   ├── <MenuBar>
│   │   ├── <Menu label="File" items={fileItems} />
│   │   ├── <Menu label="Edit" items={editItems} />
│   │   ├── <Menu label="View" items={viewItems} />
│   │   ├── <Menu label="Graph" items={graphItems} />
│   │   └── <Menu label="Help" items={helpItems} />
│   ├── <Spacer />
│   ├── <CommandPaletteButton />
│   ├── <ValidationIndicator />
│   └── <ThemeToggle />
│
├── <Sidebar>
│   ├── <SidebarSection title="Project">
│   │   └── <ProjectTree>
│   │       ├── <TreeItem type="graph" />
│   │       └── <TreeItem type="epochs" expandable>
│   │           └── <TreeItem type="epoch">
│   │               └── <TreeItem type="loop" />
│   └── <SidebarSection title="Equivalence Classes">
│       └── <EquivClassList>
│           └── <EquivClassItem />
│
├── <MainArea>
│   ├── <GraphCanvas>
│   │   ├── <ReactFlow>
│   │   │   ├── <CustomNode type={nodeType} />
│   │   │   └── <CustomEdge type={edgeType} />
│   │   ├── <MiniMap />
│   │   ├── <Controls />
│   │   └── <PathOverlay paths={highlightedPaths} />
│   │
│   ├── <PanelResizeHandle />
│   │
│   └── <BottomPanels>
│       ├── <LoopInspector>
│       │   ├── <InspectorHeader />
│       │   ├── <InspectorTabs>
│       │   │   ├── <Tab label="Details" />
│       │   │   ├── <Tab label="Decisions" />
│       │   │   └── <Tab label="Operators" />
│       │   └── <InspectorContent />
│       │
│       ├── <PanelDivider />
│       │
│       └── <NarrativePanel>
│           ├── <NarrativeHeader>
│           │   ├── <ToneSelector />
│           │   └── <DetailLevelSelector />
│           └── <NarrativeContent>
│               └── <MonacoEditor readonly />
│
└── <StatusBar>
    ├── <ValidationStatus />
    ├── <Spacer />
    ├── <LoopCount />
    ├── <EquivClassCount />
    └── <CurrentSelection />
```

---

## 4. Component Specifications

### 4.1 Header (48px)

```typescript
interface HeaderProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  validationStatus: 'valid' | 'warning' | 'error';
  errorCount: number;
  warningCount: number;
}
```

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ◇ Loop │ My Story Project         │ File Edit View Graph Help │ ⌘K │ ✓ │ ◐ │
│  24px  │     editable             │        menus              │btn │ st│thm│
└────────────────────────────────────────────────────────────────────────────────┘
     │          │                           │                     │    │   │
   16px      200px max                   flex-1               32px 32px 32px
```

**Spacing**: `padding: 0 16px; gap: 12px;`

### 4.2 Sidebar (240px default)

```typescript
interface SidebarProps {
  project: Project;
  selectedItemId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string, type: ItemType) => void;
  onToggleExpand: (id: string) => void;
}

interface TreeItemProps {
  id: string;
  label: string;
  type: 'graph' | 'epoch' | 'loop' | 'equiv-class';
  depth: number;
  isSelected: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  icon: ReactNode;
  badge?: string | number;
  onSelect: () => void;
  onToggle?: () => void;
}
```

**Tree Item Layout**:
```
┌──────────────────────────────────┐
│ ▶ 📁 Epoch: Naive (1-100)    12 │  height: 32px
│ │  │                          │ │  padding-left: depth * 16px
│ │  │                          │ │
│ caret icon  label           badge
│ 16px  20px                   24px
└──────────────────────────────────┘
```

**Interaction States**:
- Default: `bg: transparent`
- Hover: `bg: tertiary`
- Selected: `bg: accent.primary/10%, border-left: 2px solid accent.primary`
- Focused: `outline: 2px solid accent.primary`

### 4.3 Graph Canvas

```typescript
interface GraphCanvasProps {
  graph: DayGraphData;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  highlightedPath: string[] | null;  // Node IDs to highlight
  viewMode: 'edit' | 'preview';
  onNodeSelect: (nodeId: string) => void;
  onEdgeSelect: (edgeId: string) => void;
  onNodeCreate: (type: NodeType, position: XYPosition) => void;
  onEdgeCreate: (sourceId: string, targetId: string) => void;
  onNodeMove: (nodeId: string, position: XYPosition) => void;
  onNodeDelete: (nodeId: string) => void;
  onEdgeDelete: (edgeId: string) => void;
}
```

**Node Rendering**:
```
┌─────────────────────────┐
│  ●  Node Label          │  60px min-width, 36px height
│ 12px                    │  padding: 8px 12px
│ (colored by type)       │  border-radius: 6px
└─────────────────────────┘

Selected state:
- box-shadow: 0 0 0 2px accent.primary
- scale: 1.02

Path highlight:
- box-shadow: 0 0 12px node.color
- border: 2px solid node.color
```

**Edge Styles by Type**:
| Type | Stroke | Dash | Arrow |
|------|--------|------|-------|
| default | #94A3B8 | solid | yes |
| choice | #F59E0B | solid | yes |
| conditional | #3B82F6 | 4,4 | yes |
| timed | #22C55E | 2,2 | yes |
| random | #8B5CF6 | 1,4 | yes |

**MiniMap**: 120x80px, bottom-right, 16px margin

### 4.4 Loop Inspector (50% of bottom panel)

```typescript
interface LoopInspectorProps {
  loop: Loop | null;
  graph: DayGraphData;
  onUpdate: (updates: Partial<Loop>) => void;
  onOperatorApply: (op: OperatorType, target?: string) => void;
}
```

**Layout**:
```
┌────────────────────────────────────────────────────────────────┐
│ Loop #42                                              [×]      │ 40px header
├────────────────────────────────────────────────────────────────┤
│ Details │ Decisions │ Operators                                │ 36px tabs
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Status      [completed ▼]                                     │
│  Epoch       Naive (1-100)                                     │
│  Path        wake → breakfast → bank → ... (12 nodes)          │
│  Outcome     death (explosion)                                 │
│                                                                │
│  ┌─ Emotional Arc ──────────────────────────────────────────┐  │
│  │  hopeful ──────●────────────────────────────● desperate  │  │
│  │           start                          end             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Knowledge   K_050 → K_075 (+3 facts)                          │
│  Tags        [anchor] [breakthrough] [+]                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Field Spacing**:
- Label width: 80px
- Row height: 28px
- Section padding: 12px

### 4.5 Narrative Panel (50% of bottom panel)

```typescript
interface NarrativePanelProps {
  loop: Loop | null;
  generatedNarrative: string | null;
  tone: NarrativeTone;
  detailLevel: DetailLevel;
  isGenerating: boolean;
  onToneChange: (tone: NarrativeTone) => void;
  onDetailLevelChange: (level: DetailLevel) => void;
  onRegenerate: () => void;
  onCopyToClipboard: () => void;
}
```

**Layout**:
```
┌────────────────────────────────────────────────────────────────┐
│ Narrative Preview                    [Tone ▼] [Detail ▼] [⟳]  │ 40px header
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  "The coffee was cold again. She'd stopped counting how        │
│  many times she'd watched the steam fade to nothing before     │
│  the first explosion. Loop forty-two, and still no closer      │
│  to understanding why the bank vault opened at precisely       │
│  10:17 every single iteration."                                │
│                                                                │
│                                                                │
│  ─────────────────────────────────────────────────────────     │
│  Word count: 56 │ Tone: weary │ Detail: standard               │ metadata row
└────────────────────────────────────────────────────────────────┘
```

**Tone Selector Dropdown**:
```typescript
const tones: { value: NarrativeTone; label: string; description: string }[] = [
  { value: 'clinical', label: 'Clinical', description: 'Detached, analytical' },
  { value: 'hopeful', label: 'Hopeful', description: 'Optimistic despite repetition' },
  { value: 'desperate', label: 'Desperate', description: 'Frantic, panicked' },
  { value: 'melancholic', label: 'Melancholic', description: 'Sad, reflective' },
  { value: 'dark_humor', label: 'Dark Humor', description: 'Sardonic, coping' },
  { value: 'philosophical', label: 'Philosophical', description: 'Contemplative, deep' },
  { value: 'terse', label: 'Terse', description: 'Minimal, direct' },
  { value: 'poetic', label: 'Poetic', description: 'Lyrical, metaphoric' },
];
```

### 4.6 Status Bar (32px)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ✓ Valid │ 3 warnings                      │ Loops: 42 │ Classes: 7 │ Loop #42 │
│ indicator│ clickable                      │  counts                │ selection│
└────────────────────────────────────────────────────────────────────────────────┘
```

**Spacing**: `padding: 0 12px; gap: 16px; font-size: 12px;`

---

## 5. State Management (Zustand)

### Store Structure

```typescript
// stores/projectStore.ts
interface ProjectState {
  // Data
  project: Project | null;
  graph: DayGraphData | null;
  loops: Map<string, Loop>;
  epochs: Map<string, Epoch>;
  equivalenceClasses: Map<string, EquivalenceClass>;

  // Loading
  isLoading: boolean;
  loadError: string | null;

  // Actions
  loadProject: (id: string) => Promise<void>;
  saveProject: () => Promise<void>;
  updateGraph: (updates: Partial<DayGraphData>) => void;
  createLoop: (input: CreateLoopInput) => Loop;
  updateLoop: (id: string, updates: Partial<Loop>) => void;
  deleteLoop: (id: string) => void;
}

// stores/uiStore.ts
interface UIState {
  // Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedLoopId: string | null;
  selectedEpochId: string | null;
  selectedEquivClassId: string | null;

  // View state
  sidebarWidth: number;
  bottomPanelHeight: number;
  sidebarCollapsed: boolean;
  bottomPanelCollapsed: boolean;
  activeInspectorTab: 'details' | 'decisions' | 'operators';

  // Graph view
  graphViewport: { x: number; y: number; zoom: number };
  highlightedPath: string[] | null;

  // Theme
  theme: 'light' | 'dark' | 'system';

  // Modals
  commandPaletteOpen: boolean;
  activeModal: ModalType | null;

  // Actions
  selectNode: (id: string | null) => void;
  selectLoop: (id: string | null) => void;
  setHighlightedPath: (path: string[] | null) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}

// stores/narrativeStore.ts
interface NarrativeState {
  // Current generation
  tone: NarrativeTone;
  detailLevel: DetailLevel;
  generatedText: string | null;
  isGenerating: boolean;

  // Cache (loop ID -> { tone -> text })
  cache: Map<string, Map<NarrativeTone, string>>;

  // Actions
  setTone: (tone: NarrativeTone) => void;
  setDetailLevel: (level: DetailLevel) => void;
  generateNarrative: (loop: Loop) => Promise<void>;
  clearCache: () => void;
}

// stores/validationStore.ts
interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  lastValidated: Date | null;

  // Actions
  validate: () => Promise<void>;
  clearValidation: () => void;
  navigateToError: (error: ValidationError) => void;
}
```

### Store Connections

```typescript
// hooks/useWorkspace.ts
export function useWorkspace() {
  const project = useProjectStore(state => state.project);
  const graph = useProjectStore(state => state.graph);
  const selectedLoopId = useUIStore(state => state.selectedLoopId);
  const loops = useProjectStore(state => state.loops);

  const selectedLoop = selectedLoopId ? loops.get(selectedLoopId) : null;

  // Derive highlighted path from selected loop
  const highlightedPath = selectedLoop?.path ?? null;

  return { project, graph, selectedLoop, highlightedPath };
}
```

---

## 6. Keyboard Shortcuts

| Action | Shortcut | Scope |
|--------|----------|-------|
| Command Palette | `⌘K` / `Ctrl+K` | Global |
| Save | `⌘S` / `Ctrl+S` | Global |
| Undo | `⌘Z` / `Ctrl+Z` | Global |
| Redo | `⌘⇧Z` / `Ctrl+Shift+Z` | Global |
| Delete Selected | `Backspace` / `Delete` | Graph focused |
| Select All | `⌘A` / `Ctrl+A` | Graph focused |
| Zoom In | `⌘+` / `Ctrl++` | Graph focused |
| Zoom Out | `⌘-` / `Ctrl+-` | Graph focused |
| Fit View | `⌘0` / `Ctrl+0` | Graph focused |
| Toggle Sidebar | `⌘\` / `Ctrl+\` | Global |
| New Loop | `⌘N` / `Ctrl+N` | Global |
| New Node | `N` | Graph focused |
| Connect Nodes | `C` | Graph focused, with selection |
| Escape | `Esc` | Close modals/deselect |
| Next Loop | `J` / `↓` | Inspector focused |
| Previous Loop | `K` / `↑` | Inspector focused |
| Regenerate Narrative | `⌘⏎` / `Ctrl+Enter` | Narrative panel focused |

---

## 7. Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Desktop XL | ≥1440px | Full layout as specified |
| Desktop | ≥1024px | Full layout, tighter spacing |
| Tablet | ≥768px | Sidebar collapses to icons, bottom panels stack vertically |
| Mobile | <768px | Single panel view with navigation tabs |

### Tablet Layout (768-1023px)

```
┌────────────────────────────────────────────────────┐
│ HEADER                                             │
├────┬───────────────────────────────────────────────┤
│    │                                               │
│ICON│            GRAPH CANVAS                       │
│BAR │                                               │
│48px│                                               │
│    ├───────────────────────────────────────────────┤
│    │         INSPECTOR / NARRATIVE                 │
│    │         (tabbed, one visible at a time)       │
├────┴───────────────────────────────────────────────┤
│ STATUS BAR                                         │
└────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

```
┌────────────────────────────┐
│ HEADER (compact)           │
├────────────────────────────┤
│                            │
│     ACTIVE PANEL           │
│     (full height)          │
│                            │
│                            │
├────────────────────────────┤
│ [Graph][Loops][Narrative]  │  Bottom navigation
└────────────────────────────┘
```

---

## 8. Empty States

### No Project Loaded
```
┌─────────────────────────────────────┐
│                                     │
│         ◇ Loop Studio               │
│                                     │
│    No project open                  │
│                                     │
│    [New Project]  [Open Project]    │
│                                     │
│    Recent:                          │
│    • My Time Loop Story             │
│    • Groundhog Day Analysis         │
│                                     │
└─────────────────────────────────────┘
```

### No Loop Selected
```
┌─────────────────────────────────────┐
│ Loop Inspector                      │
├─────────────────────────────────────┤
│                                     │
│    Select a loop from the           │
│    sidebar or click a path          │
│    on the graph.                    │
│                                     │
│    [Create New Loop]                │
│                                     │
└─────────────────────────────────────┘
```

### Empty Graph
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                                                     │
│              Click to add your first node           │
│                     or                              │
│              drag a node type from the palette      │
│                                                     │
│         [Event] [Decision] [Location] [Death]       │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 9. Loading & Error States

### Loading
```typescript
interface LoadingOverlayProps {
  message?: string;  // "Loading project..." | "Generating narrative..."
}
```

Visual: Semi-transparent overlay with spinner and message centered.

### Error Toast
```
┌────────────────────────────────────────────┐
│ ⚠ Validation failed: Orphan node detected  │  auto-dismiss: 5s
│                              [View] [×]    │  position: bottom-right
└────────────────────────────────────────────┘
```

### Inline Error (in Inspector)
```
┌────────────────────────────────────────────┐
│ ⚠ This loop references a deleted node     │  bg: error/10%
│   Node "bank_entrance" no longer exists   │  border-left: 3px solid error
│                                [Fix]      │
└────────────────────────────────────────────┘
```

---

## 10. Implementation Priority

### Phase 1: Shell (Day 1)
1. Workspace grid layout
2. Header with project title
3. Sidebar tree structure (static)
4. Status bar
5. Theme toggle

### Phase 2: Graph Canvas (Days 2-3)
1. React Flow integration
2. Custom node components (7 types)
3. Custom edge components (5 types)
4. Node selection
5. Path highlighting

### Phase 3: Inspector & Narrative (Days 4-5)
1. Loop Inspector with tabs
2. Details tab content
3. Narrative panel
4. Tone selector
5. Monaco editor integration (readonly)

### Phase 4: Interactions (Days 6-7)
1. Create/edit/delete nodes
2. Create edges by dragging
3. Sidebar navigation updates graph
4. Keyboard shortcuts
5. Command palette

---

## 11. Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@xyflow/react": "^12.0.0",
    "@monaco-editor/react": "^4.6.0",
    "zustand": "^4.5.0",
    "dexie": "^4.0.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "@types/react": "^18.2.0"
  }
}
```

---

*Specification version: 1.0*
*Last updated: 2024-12-03*
*Ready for implementation*
