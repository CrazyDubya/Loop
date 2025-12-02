# Loop Engine

A complete time-loop narrative engine for tracking, compressing, and generating stories across potentially millions of time loops without losing coherence.

[![Tests](https://img.shields.io/badge/tests-367%20passing-brightgreen)](.)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](.)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

## What Is This?

Loop Engine is a computational storytelling system designed to handle narratives with massive iteration counts - think *Groundhog Day*, *Edge of Tomorrow*, or *Re:Zero* - where a protagonist repeats the same time period thousands or millions of times.

The engine provides:
- **Graph-based day structure** - Model time as a directed acyclic graph of events
- **Loop compression** - Collapse millions of similar loops into equivalence classes
- **Protagonist operators** - Encode character behavior patterns (cause, avoid, trigger, relive, vary)
- **Narrative generation** - Generate prose in 8 different tones from compressed loop data
- **Validation system** - Multi-layered consistency checking for temporal coherence
- **Performance optimization** - LRU caching, lazy loading, and batch processing

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests (367 tests, all passing)
npm test

# Initialize a new story
npm run loop -- init "My Groundhog Day Story"

# Build the day graph
npm run loop -- graph add-node wake_up scene 08:00 "Wake up to alarm"
npm run loop -- graph add-node breakfast scene 08:30 "Breakfast at cafe"
npm run loop -- graph add-edge e1 wake_up breakfast

# Create and narrate a loop
npm run loop -- create-loop --start wake_up
npm run loop -- narrate <loop-id> --tone dramatic

# View statistics
npm run loop -- stats
```

## Architecture

```
src/
├── validators/       # Schema validation, invariants, contradiction detection
├── graph/            # DAG-based day graph with path finding
├── loop/             # Loop storage, factory, equivalence engine
├── operators/        # cause(), avoid(), trigger(), relive(), vary()
├── narrative/        # Template engine, narrator, montage, summarizer
├── cli/              # Command-line interface
└── performance/      # Benchmarks, caching, lazy loading, capacity limits
```

## Core Concepts

### The Loop Object

```typescript
interface Loop {
  id: string;
  parent_id: string | null;
  epoch: EpochID;
  key_choices: BitVector;
  outcome_hash: string;
  knowledge_id: string;
  mood_id: string;
  tags: string[];
  created_at: Date;
}
```

### Equivalence Classes

The key insight: Most loops are variations of the same outcome. Two loops are equivalent if:
```
L1 ~ L2  ⟺  Outcome(L1) = Outcome(L2)  ∧  KnowledgeEnd(L1) = KnowledgeEnd(L2)
```

This allows compressing millions of loops into thousands of classes, enabling narrative summaries like:
> "He tried that path 347 times. Different streets, different words, same explosion."

### Loop Operators

Model protagonist behavior as graph operations:

- **`cause(event)`** - Find paths maximizing probability of event occurring
- **`avoid(event)`** - Find paths excluding event
- **`trigger(A→B→C)`** - Find paths forcing a specific sequence
- **`relive(loopId)`** - Find paths similar to a previous loop
- **`vary(loopId, distance)`** - Generate controlled variations

### Narrative Tones

Generate prose in 8 distinct emotional registers:
- **clinical** - Detached, analytical
- **dramatic** - Heightened emotion
- **sardonic** - Dark humor
- **hopeful** - Optimistic despite repetition
- **weary** - Exhausted, numb
- **detached** - Dissociated observation
- **frantic** - Panicked desperation
- **reflective** - Contemplative wisdom

## CLI Commands

```bash
# Project management
loop init <name>                    # Initialize new project

# Graph construction
loop graph nodes                    # List all graph nodes
loop graph edges                    # List all edges
loop graph add-node <id> <type> <time> <label>
loop graph add-edge <id> <from> <to>
loop graph visualize [--format dot|mermaid]
loop graph validate                 # Check graph structure

# Loop management
loop list [--limit N] [--status S]  # List loops
loop show <id>                      # Show loop details
loop validate                       # Validate all loops

# Narrative generation
loop narrate <id> [--tone T]        # Generate prose for a loop
loop summarize <id>                 # Generate loop summary

# Analysis
loop stats                          # Show project statistics
loop export [--format json|summary] # Export project data
```

## Features

### ✅ Complete Implementation

- **367 passing tests** across 17 test suites
- **10,436 lines** of source code
- **5,511 lines** of test code
- **8 JSON schemas** with full validation
- **Comprehensive documentation** including critique, reflection, and limitations

### Performance

- LRU cache with TTL and statistics tracking
- Tiered caching (L1/L2)
- Lazy loading with backpressure
- Batch operations
- Stream processing
- Honest capacity documentation

### Validation

- **Schema validation** - JSON Schema compliance
- **Invariant checking** - Business rule enforcement
- **Contradiction detection** - Logical conflict identification
- **Consistency checking** - Temporal coherence validation

### Honest Limitations

We document what we *can't* do:
- In-memory storage only (no persistence layer)
- Single-process (no concurrency)
- No real-time sync (no network layer)
- Path finding slows at >100 nodes
- Equivalence detection is O(n²)

## Development History

This project began as a 336-line design document and evolved through three parallel implementation approaches:

1. **PR #1**: Conceptual expansion with practical task breakdowns
2. **PR #2**: Python implementation (5 phases, partial completion)
3. **PR #3**: TypeScript implementation (12 phases, 100% complete) ← **Current baseline**

PR #3 started with a brutal critique of the original design, then built the entire system to prove it could work. The result is a production-ready narrative engine.

## Writing Stories With Loop Engine

See [WRITING-GUIDE.md](./docs/WRITING-GUIDE.md) for comprehensive guidance on:
- Defining your day graph
- Designing anchor loops
- Creating equivalence classes
- Structuring epochs
- Writing narrative prose

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/graph/DayGraph.test.ts

# Watch mode
npm run test:watch

# Lint code
npm run lint
```

## Contributing

This is currently a personal project. If you're interested in contributing, please open an issue first to discuss your ideas.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

This project explores narrative engineering at scale, inspired by time-loop fiction across anime, manga, light novels, and Western media.

---

**Status**: Production-ready baseline (v1.0)
**Build**: 367/367 tests passing
**Completeness**: 12/12 phases implemented
