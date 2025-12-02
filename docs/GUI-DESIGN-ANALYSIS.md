# Loop Engine GUI Design Analysis

A systematic analysis from 10 possibilities to a unified design.

---

## Part I: Ten Possible GUI Paths

### 1. **Electron Desktop Application**
- **Approach**: Full cross-platform desktop app using Electron + React
- **Strengths**: Native feel, offline-first, file system access, no server needed
- **Weaknesses**: Heavy (Chromium bundle ~150MB), memory intensive
- **Audience**: Serious authors wanting dedicated tool
- **Complexity**: High

### 2. **Web-based React SPA**
- **Approach**: Browser-based single-page application
- **Strengths**: Zero install, accessible anywhere, easy updates, shareable URLs
- **Weaknesses**: Requires hosting, online dependency, file access limited
- **Audience**: Casual to serious authors, collaborative teams
- **Complexity**: Medium

### 3. **VS Code Extension**
- **Approach**: Integrate directly into Visual Studio Code
- **Strengths**: Leverages Monaco editor, authors already in IDE, rich API
- **Weaknesses**: Requires VS Code, limited UI paradigms, webview constraints
- **Audience**: Technical authors, developer-writers
- **Complexity**: Medium

### 4. **Obsidian Plugin**
- **Approach**: Plugin for Obsidian note-taking app
- **Strengths**: Authors already use Obsidian for worldbuilding, markdown-native
- **Weaknesses**: Obsidian-locked, plugin API limitations, small market
- **Audience**: Obsidian-using authors (growing niche)
- **Complexity**: Medium

### 5. **Graph-First Visual Canvas**
- **Approach**: D3.js/Cytoscape.js/React Flow centered on interactive DAG editing
- **Strengths**: Visual thinking, intuitive for graph concepts, beautiful
- **Weaknesses**: Complex to implement well, less focus on prose
- **Audience**: Visual thinkers, plot architects
- **Complexity**: High

### 6. **Narrative-First Writing Interface**
- **Approach**: Monaco/Prose Mirror editor with loop-aware features
- **Strengths**: Writers focus on prose, tools support in sidebar
- **Weaknesses**: May underutilize graph/loop power features
- **Audience**: Writers who think in prose first
- **Complexity**: Medium

### 7. **Timeline/Kanban Hybrid**
- **Approach**: Loops as cards, epochs as columns, timeline as swimlanes
- **Strengths**: Familiar UX patterns, great for organization
- **Weaknesses**: May not capture graph complexity, could feel generic
- **Audience**: Project-management minded authors
- **Complexity**: Low-Medium

### 8. **Mobile Companion App (React Native)**
- **Approach**: iOS/Android app for quick capture and review
- **Strengths**: Capture ideas anywhere, review on transit
- **Weaknesses**: Not for serious editing, separate codebase
- **Audience**: Authors on the go
- **Complexity**: Medium

### 9. **Tauri Desktop Application**
- **Approach**: Lightweight native wrapper using Rust + web frontend
- **Strengths**: Tiny bundle (~10MB), fast, native OS integration
- **Weaknesses**: Smaller ecosystem than Electron, newer technology
- **Audience**: Performance-conscious authors
- **Complexity**: Medium-High

### 10. **Terminal UI (TUI)**
- **Approach**: Rich terminal interface using Ink (React for CLI) or Blessed
- **Strengths**: Fast, hackers love it, works over SSH
- **Weaknesses**: Limited audience, steep learning curve
- **Audience**: Terminal-loving authors, power users
- **Complexity**: Medium

---

## Part II: Five Concrete Ideas

Condensing the 10 paths by merging related concepts and eliminating edge cases:

### Idea A: **Web-First Progressive Application**
*Merges: #2 (React SPA) + #5 (Graph Canvas) + #6 (Narrative Interface)*

A browser-based application that works offline (PWA) combining:
- Interactive graph editor using React Flow
- Split-pane narrative editor with Monaco
- Real-time validation feedback
- Export to local files

**Stack**: React 18, React Flow, Monaco Editor, TailwindCSS, IndexedDB
**Deployment**: Static hosting (Vercel/Netlify) + PWA for offline

### Idea B: **VS Code Extension Suite**
*Merges: #3 (VS Code) + #6 (Narrative Interface)*

Deep integration into VS Code with:
- Custom file type (`.loop`) with syntax highlighting
- Graph preview panel (Webview with D3.js)
- IntelliSense for loop references
- Command palette integration with CLI
- Sidebar for loop/epoch navigation

**Stack**: VS Code Extension API, Webview, existing TypeScript core

### Idea C: **Electron Powerhouse**
*Merges: #1 (Electron) + #5 (Graph Canvas) + #7 (Timeline)*

Full-featured desktop application:
- Native menu bar and keyboard shortcuts
- Multi-window support (graph + narrative + timeline)
- Direct file system access
- Auto-save and versioning
- Export to various formats

**Stack**: Electron, React, React Flow, Monaco, electron-store

### Idea D: **Tauri Lightweight Native**
*Merges: #9 (Tauri) + #5 (Graph Canvas)*

Performance-focused desktop app:
- Same React frontend as web version
- Native Rust backend for performance
- Tiny install size (~10-15MB)
- Native file dialogs and system integration

**Stack**: Tauri, React, React Flow, Rust for backend operations

### Idea E: **Multi-Platform Core + Shells**
*Merges: Multiple platforms with shared core*

Shared React component library deployable as:
- Web app (primary)
- Electron wrapper (desktop)
- VS Code webview (extension)
- Mobile webview (companion)

**Stack**: React component library + platform adapters

---

## Part III: Three Recommendations

### Recommendation 1: **Web-First PWA** (Idea A)
**Priority: Accessibility & Reach**

| Aspect | Details |
|--------|---------|
| **Why** | Zero friction, works everywhere, easy to share and collaborate |
| **Best For** | Maximum audience reach, quick iteration |
| **Trade-off** | Limited native OS integration |
| **Time to MVP** | 4-6 weeks |

**Core Features**:
- Interactive DAG editor with drag-and-drop
- Side-by-side graph + narrative view
- Real-time validation with inline errors
- Local storage with IndexedDB
- Export/import JSON projects
- 8 narrative tone preview modes

### Recommendation 2: **VS Code Extension** (Idea B)
**Priority: Developer Experience & Workflow Integration**

| Aspect | Details |
|--------|---------|
| **Why** | Authors already in editor, leverages ecosystem |
| **Best For** | Technical authors, rapid prototyping |
| **Trade-off** | Requires VS Code, limited visual richness |
| **Time to MVP** | 3-4 weeks |

**Core Features**:
- `.loop` and `.daygraph` file syntax highlighting
- Tree view for project navigation
- Inline validation diagnostics
- Webview panel for graph visualization
- Command palette for all CLI commands
- Hover information for loop references

### Recommendation 3: **Electron Desktop App** (Idea C)
**Priority: Power & Polish**

| Aspect | Details |
|--------|---------|
| **Why** | Full native experience, offline-first, professional feel |
| **Best For** | Serious long-form authors, offline work |
| **Trade-off** | Larger bundle, more maintenance |
| **Time to MVP** | 6-8 weeks |

**Core Features**:
- Multi-pane workspace (graph, narrative, timeline, loops)
- Native file operations (open, save, recent files)
- Keyboard-driven workflow
- Full offline capability
- Auto-save with local versioning
- Export to markdown, HTML, PDF

---

## Part IV: Unified Design

Taking the best elements from all three recommendations into a single, cohesive architecture.

### The Unified Vision: **Loop Studio**

A modular architecture where the same React components power multiple deployment targets, starting with web and optionally extending to desktop.

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOOP STUDIO                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    UNIFIED CORE                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │  Graph   │ │  Loop    │ │ Narrative│ │Validation│   │    │
│  │  │  Engine  │ │  Manager │ │  Engine  │ │  System  │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  │               (Existing TypeScript Core)                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 SHARED UI COMPONENTS                      │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │ GraphCanvas │ NarrativeEditor │ LoopTimeline     │   │    │
│  │  │ LoopCard    │ EpochColumn     │ ValidationPanel  │   │    │
│  │  │ TonePreview │ PathHighlight   │ DecisionTree     │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  │                  (React + TailwindCSS)                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────────┬───────────────┬───────────────────────┐      │
│  │   WEB (PWA)   │    DESKTOP    │     VS CODE EXT       │      │
│  │   Primary     │    Optional   │     Optional          │      │
│  │   React App   │    Electron   │     Webview           │      │
│  └───────────────┴───────────────┴───────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

### Unified Layout: The Four-Pane Workspace

```
┌─────────────────────────────────────────────────────────────────────────┐
│  File  Edit  View  Graph  Loop  Narrative  Help            ≡  ─  □  ✕  │
├────────┬────────────────────────────────────────────────────────────────┤
│        │                                                                │
│ PROJECT│                     MAIN CANVAS                                │
│ TREE   │                                                                │
│        │  ┌─────────────────────────────────────────────────────────┐  │
│ ▼ Epoch│  │                                                         │  │
│   ├ L1 │  │              INTERACTIVE DAY GRAPH                      │  │
│   ├ L2 │  │                                                         │  │
│   └ L3 │  │     [wake]──→[breakfast]──→[decision]                   │  │
│        │  │                              ↙     ↘                     │  │
│ ▼ Epoch│  │                      [path_a]   [path_b]                │  │
│   ├ L4 │  │                          ↘     ↙                        │  │
│   └ L5 │  │                        [convergence]──→[end]            │  │
│        │  │                                                         │  │
│ ▼ Equiv│  └─────────────────────────────────────────────────────────┘  │
│   └ EC1│                                                                │
│        ├────────────────────────────────────────────────────────────────┤
│        │                                                                │
│        │  ┌───────────────────────┬─────────────────────────────────┐  │
│        │  │   LOOP INSPECTOR      │    NARRATIVE PREVIEW            │  │
│        │  │                       │                                 │  │
│        │  │  Loop #42             │    "The coffee was cold again.  │  │
│        │  │  Status: completed    │    She'd stopped counting how   │  │
│        │  │  Path: wake→...→end   │    many times..."               │  │
│        │  │  Outcome: death       │                                 │  │
│        │  │  Knowledge: +3 facts  │    [Tone: weary ▼]              │  │
│        │  │  Decisions: 4         │    [Detail: medium ▼]           │  │
│        │  │                       │    [Regenerate]                 │  │
│        │  └───────────────────────┴─────────────────────────────────┘  │
│        │                                                                │
├────────┴────────────────────────────────────────────────────────────────┤
│  ⚡ Valid  │  Loops: 42  │  Equiv Classes: 7  │  Current: Loop #42      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Core Components Specification

#### 1. **GraphCanvas** (Central Feature)
```typescript
interface GraphCanvasProps {
  graph: DayGraphData;
  highlightedPath?: string[];      // Current loop's path
  selectedNode?: string;
  onNodeClick: (nodeId: string) => void;
  onEdgeClick: (edgeId: string) => void;
  onNodeAdd: (type: NodeType, position: Position) => void;
  onEdgeAdd: (source: string, target: string) => void;
  viewMode: 'edit' | 'preview' | 'comparison';
}
```

**Features**:
- Drag-and-drop node creation
- Edge drawing by connecting nodes
- Path highlighting for loop visualization
- Mini-map for large graphs
- Zoom and pan controls
- Node type color coding
- Export to DOT/Mermaid with one click

**Technology**: React Flow (preferred for React ecosystem)

#### 2. **NarrativeEditor** (Writing Interface)
```typescript
interface NarrativeEditorProps {
  loop: Loop;
  template?: string;
  tone: NarrativeTone;
  detailLevel: 'minimal' | 'standard' | 'detailed';
  onToneChange: (tone: NarrativeTone) => void;
  onGenerate: () => void;
  onEdit: (content: string) => void;
}
```

**Features**:
- Monaco Editor for prose editing
- Tone selector with live preview
- Template variable insertion
- Side-by-side: generated vs. edited
- Word count and reading time
- Export to markdown

#### 3. **LoopTimeline** (Temporal Overview)
```typescript
interface LoopTimelineProps {
  loops: Loop[];
  epochs: Epoch[];
  equivalenceClasses: EquivalenceClass[];
  selectedLoopId?: string;
  viewMode: 'chronological' | 'grouped' | 'compressed';
  onLoopSelect: (loopId: string) => void;
  onEpochSelect: (epochId: string) => void;
}
```

**Features**:
- Horizontal timeline of loops
- Epoch grouping with collapsible sections
- Equivalence class compression view
- Color coding by outcome
- Zoom from single loops to epoch overview
- Anchor loop highlighting

#### 4. **ValidationPanel** (Real-time Feedback)
```typescript
interface ValidationPanelProps {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: Suggestion[];
  onErrorClick: (error: ValidationError) => void;
  autoFix?: boolean;
}
```

**Features**:
- Live validation as you edit
- Categorized issues (error/warning/info)
- Click-to-navigate to problem location
- Auto-fix suggestions where possible
- Contradiction detection visualization

#### 5. **LoopInspector** (Detail View)
```typescript
interface LoopInspectorProps {
  loop: Loop;
  graph: DayGraphData;
  relatedLoops: Loop[];
  equivalenceClass?: EquivalenceClass;
  onEdit: (updates: Partial<Loop>) => void;
  onOperatorApply: (operator: OperatorType, params: OperatorParams) => void;
}
```

**Features**:
- All loop properties displayed
- Decision list with rationale
- Emotional state visualization (start → end)
- Path overlay on graph
- Operator quick-actions (cause, avoid, trigger, etc.)
- Related loops in equivalence class

---

### Design Principles

#### 1. **Progressive Disclosure**
- Simple view by default, complexity revealed on demand
- Beginners see: Graph + Narrative preview
- Advanced users unlock: Operators, equivalence classes, sub-loops

#### 2. **Graph-Narrative Duality**
- Every action in graph reflects in narrative
- Every narrative edit can update underlying structure
- Bidirectional sync with visual feedback

#### 3. **Validation-First**
- Real-time validation, not batch
- Errors prevent broken states
- Warnings suggest improvements
- Never lose work (auto-save always)

#### 4. **Keyboard-Driven Option**
- Full keyboard navigation
- Vim-like bindings option
- Command palette (Cmd+K)
- Quick loop creation shortcuts

#### 5. **Offline-First**
- IndexedDB for local storage
- Work without internet
- Sync when online (optional cloud)
- Export/import always available

---

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **UI Framework** | React 18 | Ecosystem, React Flow, Monaco |
| **Styling** | TailwindCSS | Rapid development, consistent |
| **Graph Viz** | React Flow | Best React integration, customizable |
| **Code Editor** | Monaco Editor | VS Code familiarity, TypeScript |
| **State** | Zustand | Simple, scalable, good DX |
| **Validation** | AJV (existing) | Already in codebase |
| **Storage** | IndexedDB (Dexie) | Offline-first, structured |
| **Build** | Vite | Fast HMR, ESM native |
| **Desktop** | Electron (optional) | Same codebase, native feel |

---

### Implementation Phases

#### Phase 1: Foundation (Week 1-2)
- [ ] Project setup (Vite + React + TypeScript)
- [ ] TailwindCSS configuration
- [ ] Basic layout shell (4-pane structure)
- [ ] Core bridge to existing TypeScript engine
- [ ] IndexedDB storage layer

#### Phase 2: Graph Canvas (Week 2-3)
- [ ] React Flow integration
- [ ] Node type components (7 types)
- [ ] Edge type rendering (5 types)
- [ ] Add/edit/delete nodes and edges
- [ ] Path highlighting
- [ ] Export to DOT/Mermaid

#### Phase 3: Loop Management (Week 3-4)
- [ ] Project tree navigation
- [ ] Loop CRUD operations
- [ ] Loop inspector panel
- [ ] Epoch organization
- [ ] Equivalence class display

#### Phase 4: Narrative System (Week 4-5)
- [ ] Monaco Editor integration
- [ ] Tone selector and preview
- [ ] Template variable insertion
- [ ] Generated vs. edited comparison
- [ ] Export to markdown

#### Phase 5: Validation & Polish (Week 5-6)
- [ ] Real-time validation panel
- [ ] Error navigation
- [ ] Keyboard shortcuts
- [ ] Command palette
- [ ] Dark/light theme

#### Phase 6: PWA & Distribution (Week 6)
- [ ] Service worker for offline
- [ ] PWA manifest
- [ ] Installable from browser
- [ ] Export/import complete projects

#### Phase 7 (Optional): Electron Wrapper
- [ ] Electron shell
- [ ] Native file dialogs
- [ ] Auto-update system
- [ ] Platform builds (macOS, Windows, Linux)

---

### File Structure

```
gui/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── index.html
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── CommandPalette.tsx
│   │   ├── graph/
│   │   │   ├── GraphCanvas.tsx
│   │   │   ├── NodeComponent.tsx
│   │   │   ├── EdgeComponent.tsx
│   │   │   └── MiniMap.tsx
│   │   ├── loop/
│   │   │   ├── LoopInspector.tsx
│   │   │   ├── LoopCard.tsx
│   │   │   ├── LoopTimeline.tsx
│   │   │   └── OperatorPanel.tsx
│   │   ├── narrative/
│   │   │   ├── NarrativeEditor.tsx
│   │   │   ├── ToneSelector.tsx
│   │   │   └── TemplatePreview.tsx
│   │   ├── validation/
│   │   │   ├── ValidationPanel.tsx
│   │   │   └── ErrorItem.tsx
│   │   └── project/
│   │       ├── ProjectTree.tsx
│   │       ├── EpochItem.tsx
│   │       └── EquivClassItem.tsx
│   ├── stores/
│   │   ├── projectStore.ts
│   │   ├── graphStore.ts
│   │   ├── loopStore.ts
│   │   └── uiStore.ts
│   ├── hooks/
│   │   ├── useGraph.ts
│   │   ├── useLoop.ts
│   │   ├── useValidation.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── services/
│   │   ├── storage.ts
│   │   ├── engineBridge.ts
│   │   └── exportService.ts
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── globals.css
└── electron/ (optional)
    ├── main.ts
    ├── preload.ts
    └── package.json
```

---

### Key Differentiators

What makes Loop Studio unique:

1. **Purpose-Built for Time Loops**: Not a generic graph tool, but designed specifically for narrative time-loop logic

2. **Equivalence-Aware**: Understands loop compression, shows "347 loops like this" inline

3. **Narrative-Graph Duality**: Seamlessly switch between visual graph thinking and prose output

4. **8-Tone Narrative Preview**: See how the same loop reads in different emotional registers

5. **Operator-Driven Exploration**: cause(), avoid(), trigger() as first-class UI actions

6. **Validation at Every Step**: Never create an invalid loop state

7. **Offline-First**: Full functionality without internet

---

### Success Metrics

| Metric | Target |
|--------|--------|
| Time to first graph | < 2 minutes |
| Time to generate first narrative | < 5 minutes |
| Loops created per session | 10+ |
| Crash rate | < 0.1% |
| Offline capability | 100% features |
| Bundle size (web) | < 2MB |
| First paint | < 1.5s |

---

### Summary

**Loop Studio** unifies the best aspects of all approaches:

- **From Web PWA**: Accessibility, zero install, easy sharing
- **From VS Code**: Monaco editor, keyboard-first, developer familiarity
- **From Electron**: Native feel option, full offline, file system access
- **From Graph Canvas**: Visual DAG editing, beautiful visualization
- **From Narrative Interface**: Writing-focused, tone preview, prose generation
- **From Timeline View**: Temporal organization, epoch management

The result is a **modular, web-first application** that can optionally be packaged as a desktop app, providing the **best author experience** for creating complex time-loop narratives with the Loop Engine.

---

*Document created: 2025-12-02*
*For: Loop Engine GUI Design*
