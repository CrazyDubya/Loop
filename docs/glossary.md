# Loop Engine Glossary

Canonical definitions for all terms. When in doubt, this is authoritative.

---

## Core Concepts

### Loop
A single traversal of the day graph from start to reset. Contains:
- Decision trace (path taken)
- Outcome (how it ended)
- Knowledge state (what was learned)
- Mood state (emotional effect)

### Sub-Loop
A nested reset within a single loop. The protagonist rewinds to an earlier point *within the same day* without triggering a full reset. Used for "trapped in 8 minutes" scenarios.

### Day Graph
The underlying structure of possible events and transitions. All loops traverse this same graph with different paths.

### Time Slot
A discrete unit of time within a day. Represented as integers: t0, t1, t2, ... tN. Events happen at specific time slots.

### Reset
The end of a loop, triggering return to t0. Can be caused by:
- Death (forced reset)
- Day completion (natural reset)
- Intentional reset (protagonist chooses to restart)

---

## Graph Components

### Event Node
A point in the day graph representing something that can happen. Has:
- Time slot (when)
- Type (critical/soft/death/revelation)
- Preconditions (what must be true)
- Effects (what becomes true)

### Transition
A directed edge between nodes. Represents "if you're at A, you can go to B." Has:
- Time cost
- Conditions (knowledge or state required)
- Probability (some transitions are uncertain)

### Critical Node
An event that significantly affects outcomes or knowledge. Branch points, key decisions, revelations.

### Soft Node
An event that affects mood/texture but not outcomes. Flavor, color, atmosphere.

### Death Node
An absorbing state that ends the loop. Protagonist dies, everyone dies, etc.

### Revelation Node
An event that grants new knowledge. "Aha" moments.

---

## Loop Properties

### Decision Trace
The sequence of node IDs visited during a loop. The "path" through the graph.

### Key Choices
A compressed bit vector of the most important decisions. Used for Hamming distance calculations.

### Outcome Hash
A deterministic hash of what happened. Same survivors + deaths + state changes = same hash.

### Knowledge State
What the protagonist knows at loop end. Set of facts, secrets, skills.

### Knowledge ID
Hash of knowledge state. Used for equivalence comparison.

### Mood State
Emotional/psychological state at loop end. Trauma, hope, numbness, etc.

### Mood ID
Hash of mood state. Used for equivalence comparison.

---

## Compression

### Equivalence Class
A group of loops that are "the same" for narrative purposes. Same outcome_hash AND same knowledge_id.

### Representative Loop
The one loop chosen to represent an equivalence class. Usually the first or most interesting.

### Sample Loops
3-5 loops from a class shown in detail. The rest are implied.

### Anchor Loop
A loop selected for full narrative treatment. Key story moments: breakthroughs, failures, turning points.

### Montage
A compressed representation of many similar loops. "347 times, same explosion." Contains count + samples.

### Parametric Family
A group of loops defined by shared strategy parameters. All "stealth + medium risk + save sister" loops.

---

## Operators

### cause(event)
Operator that generates loops maximizing probability of target event occurring.

### avoid(event)
Operator that generates loops minimizing probability of target event.

### trigger(sequence)
Operator that generates loops passing through a specific sequence of events in order.

### relive(loop_ref)
Operator that generates loops very similar to a reference loop. Minimal changes.

### slightly_change(loop_ref)
Operator that generates loops with small Hamming distance from reference (1-2 decisions different).

### greatly_change(loop_ref)
Operator that generates loops with large Hamming distance from reference (many decisions different).

### Hamming Distance
Count of bits that differ between two decision vectors. Measures how "different" two loops are.

---

## Policies

### Policy
A strategy that selects which operator to use and with what parameters. Defines protagonist behavior patterns.

### Naive Policy
Random exploration. Early loop behavior.

### Scientist Policy
Systematic testing. Vary one thing at a time. "Does X always happen?"

### Desperate Policy
Chaos. Try anything. greatly_change spam.

### Perfectionist Policy
Iterate toward ideal. relive + slightly_change refinement.

### Obsessive Policy
Repeat the same sequence. trigger obsession.

---

## Narrative

### Epoch
A major phase of the protagonist's journey. Groups of loops with shared strategy/mood. Examples:
- Naive/Denial
- Mapping/Experimenting
- Obsession/Escalation
- Ruthlessness/Burnout
- Synthesis/Transcendence

### Epoch Transition
The shift from one epoch to another. A turning point where strategy or psychology changes.

### Detail Level
How much prose to generate for a loop:
- **Full**: Complete scene-by-scene narration
- **Summary**: Key beats only
- **Flash**: Single paragraph, outcome focus

### Prose Template
A fill-in-the-blank structure for generating text. "He tried [ACTION] [COUNT] times. [VARIATIONS]. [OUTCOME]."

---

## Data Types

### LoopID
UUID string identifying a unique loop.

### ClassID
UUID string identifying an equivalence class.

### NodeID
String identifying an event node in the day graph.

### TimeSlot
Integer (0 to N) representing a point in the day.

### BitVector
Integer where each bit represents a binary decision. Used for key_choices.

### Hash
16-character hex string (truncated SHA256). Used for outcome_hash, knowledge_id.

---

## Metrics

### Compression Ratio
`total_loops / equivalence_classes`. Higher = more efficient compression.

### Anchor Density
`anchor_loops / total_loops`. Typically 0.01 (1%).

### Knowledge Coverage
`facts_discovered / total_discoverable_facts`. Progress toward omniscience.

### Epoch Distribution
Count of loops per epoch. Shows where protagonist spent time.

---

## Special Terms

### The Million Loop Problem
The core challenge: how to track, compress, and narrate a story spanning ~1,000,000 time loops without losing coherence or sanity.

### The Compression Cheats
Techniques for making a million loops manageable:
1. Equivalence classes (same outcome = same loop)
2. Parametric families (strategy defines clusters)
3. Montage compression (show 3, imply 1000)
4. Early termination clustering (deaths before noon)
5. Sub-loop macros (nested hell sequences)

### Agentic Execution
Running the engine with specialized AI agents, each handling their domain. "Right agent, right context, right time."
