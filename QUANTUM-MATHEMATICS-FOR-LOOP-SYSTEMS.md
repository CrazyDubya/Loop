# Quantum Mathematics for Classical Loop Systems

## Executive Summary

The Loop Engine as designed operates on **classical computing principles**: deterministic graphs, binary equivalence classes, and discrete decision vectors. However, many core problems in narrative loop management have striking parallels to quantum physics phenomena. This document explores how **quantum mathematical formalisms**—even when implemented on classical hardware—can dramatically enhance the Loop Engine's expressiveness, efficiency, and ability to model "impossible" narrative situations.

---

## Part I: The Classical Foundation

### Current Architecture Review

The Loop Engine (as implemented on the `critique-starthere` branch) uses these core structures:

```
┌─────────────────────────────────────────────────────────────────┐
│                         DAY GRAPH                                │
│  ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐               │
│  │ Node │────▶│ Node │────▶│ Node │────▶│ Node │               │
│  │  t0  │     │  t1  │     │  t2  │     │  t3  │               │
│  └──────┘     └──────┘     └──────┘     └──────┘               │
│       \          │            │            ▲                    │
│        \         ▼            ▼            │                    │
│         └──▶┌──────┐     ┌──────┐─────────┘                    │
│             │ Node │────▶│ Node │                               │
│             │  t1' │     │  t2' │                               │
│             └──────┘     └──────┘                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          LOOPS                                   │
│                                                                  │
│  Loop₁: path = [n0, n1, n2, n3], decision_vector = [0, 1, 0]    │
│  Loop₂: path = [n0, n1', n2', n3], decision_vector = [1, 0, 1]  │
│                                                                  │
│  Equivalence: hash(outcome + knowledge) → Class ID              │
│  Distance: Hamming(decision_vector₁, decision_vector₂)          │
└─────────────────────────────────────────────────────────────────┘
```

### Classical Limitations

1. **Binary Equivalence**: Loops are either equivalent or not. No "partial similarity."
2. **Deterministic Paths**: Each decision produces exactly one outcome.
3. **Independent Loops**: No correlation between loops beyond explicit parent-child.
4. **Flat Probability**: Edge weights are simple scalars.
5. **No Interference**: Multiple potential paths don't affect each other.

---

## Part II: Quantum Mathematical Concepts

### 2.1 Superposition: Loops as Quantum States

In quantum mechanics, a particle exists in a **superposition** of states until measured. We can apply this to loops:

#### The Quantum Loop State

Instead of a loop being definitively "Loop₁" or "Loop₂", we represent it as:

```
|Ψ⟩ = α|Loop₁⟩ + β|Loop₂⟩ + γ|Loop₃⟩ + ...

where |α|² + |β|² + |γ|² + ... = 1
```

**α, β, γ** are **complex amplitudes**. Their squared magnitudes give probabilities.

#### Application: "Undecided" Loops

In narrative terms, this models:
- The protagonist considering multiple approaches simultaneously
- Loops that "haven't been written yet" but exist as possibilities
- The author maintaining multiple potential storylines

```typescript
interface QuantumLoopState {
  amplitudes: Map<string, Complex>;  // loop_id -> amplitude

  // Normalize ensures |α|² + |β|² + ... = 1
  normalize(): void;

  // Collapse to classical loop (probabilistic)
  measure(): Loop;

  // Get probability of specific loop
  probability(loopId: string): number;
}

class Complex {
  constructor(public real: number, public imag: number) {}

  magnitude(): number {
    return Math.sqrt(this.real ** 2 + this.imag ** 2);
  }

  magnitudeSquared(): number {
    return this.real ** 2 + this.imag ** 2;
  }
}
```

#### Narrative Value

> "He stood at the crossroads, not choosing, not yet. In some sense, he was already walking down all three paths, his future self a ghost in each direction."

The superposition state *is* the narrative reality until the story "observes" it.

---

### 2.2 Interference: When Paths Affect Each Other

In quantum mechanics, probability amplitudes can **constructively** or **destructively** interfere:

```
Path A amplitude: α = 0.5 + 0.5i
Path B amplitude: β = 0.5 - 0.5i

Combined: α + β = 1.0 + 0i  (constructive interference)

vs.

Path A amplitude: α = 0.5 + 0.5i
Path B amplitude: β = -0.5 - 0.5i

Combined: α + β = 0  (destructive interference, path impossible!)
```

#### Application: Loop Path Interference

When a protagonist "almost" takes multiple paths, those paths interfere:

```typescript
interface PathAmplitude {
  path: string[];        // Node sequence
  amplitude: Complex;    // Quantum amplitude
}

function computeInterference(
  paths: PathAmplitude[],
  targetNode: string
): number {
  // Sum amplitudes (not probabilities!) for paths reaching target
  let totalAmplitude = new Complex(0, 0);

  for (const p of paths) {
    if (p.path.includes(targetNode)) {
      totalAmplitude = totalAmplitude.add(p.amplitude);
    }
  }

  // Probability is magnitude squared of total amplitude
  return totalAmplitude.magnitudeSquared();
}
```

#### The Double-Slit Loop

Consider a day with two possible routes (A and B) that reconverge at event E:

```
     ┌──── Route A ────┐
Start                    ──▶ Event E
     └──── Route B ────┘
```

**Classical**: P(E) = P(A→E) + P(B→E)

**Quantum**: P(E) = |α_A + α_B|²

This can be **greater than** (constructive) or **less than** (destructive) the classical sum!

#### Narrative Value

> "Every time he tried to reach the station by the riverside, something stopped him. It was as if the universe itself was conspiring—as if his attempts through the park somehow cancelled out his attempts along the water, leaving him frozen between them."

This models "impossible" situations in loop fiction where certain outcomes become unreachable despite multiple viable paths.

---

### 2.3 Entanglement: Correlated Loop Pairs

Two quantum particles can be **entangled** such that measuring one instantly determines the state of the other, regardless of distance.

#### Application: Entangled Loops

Two loops become "entangled" when they share a causal structure that correlates their outcomes:

```typescript
interface EntangledPair {
  loop_a: string;
  loop_b: string;

  // Bell state type determines correlation
  // |Φ+⟩: both loops have SAME outcome
  // |Φ-⟩: both loops have OPPOSITE outcomes
  // |Ψ+⟩, |Ψ-⟩: more complex correlations
  bellState: 'phi_plus' | 'phi_minus' | 'psi_plus' | 'psi_minus';

  // Correlation strength (0 to 1)
  correlation: number;

  // What property is correlated?
  correlatedProperty: 'outcome' | 'knowledge' | 'emotion' | 'decision_vector';
}

class EntanglementEngine {
  // When loop A is measured (written/committed), loop B collapses
  onLoopMeasured(loopId: string): Loop[] {
    const pairs = this.getEntangledPairs(loopId);
    const collapsedLoops: Loop[] = [];

    for (const pair of pairs) {
      const partnerId = pair.loop_a === loopId ? pair.loop_b : pair.loop_a;
      const collapsed = this.collapsePartner(pair, loopId, partnerId);
      collapsedLoops.push(collapsed);
    }

    return collapsedLoops;
  }
}
```

#### Narrative Value

> "In Loop 4,721, he saved her but lost himself. In some other loop—he couldn't remember the number—a different him had made the opposite choice. And somehow, impossibly, he knew: as long as that other version had lost her, he could keep her here. They were bound together, those two loops, like two sides of a coin that could never both land heads-up."

Entanglement models:
- Loops that "cancel out" (one success requires one failure)
- Character versions that share fate across loops
- Conservation laws in the narrative physics

---

### 2.4 Hilbert Spaces: Beyond Flat Decision Vectors

Currently, decision vectors are simple arrays: `[0, 1, 0, 2, 1]`. This is a vector in ℝⁿ with Hamming distance.

#### Upgrade to Hilbert Space

A **Hilbert space** is a complete inner product space—the natural home for quantum states:

```typescript
interface HilbertSpaceDecision {
  // Instead of discrete choices, decisions exist in continuous space
  // with complex amplitudes
  dimensions: number;

  // State vector in the Hilbert space
  stateVector: Complex[];

  // Inner product defines similarity (replaces Hamming distance)
  innerProduct(other: HilbertSpaceDecision): Complex;

  // Fidelity: quantum similarity measure
  fidelity(other: HilbertSpaceDecision): number;
}

function quantumSimilarity(
  loop1: HilbertSpaceDecision,
  loop2: HilbertSpaceDecision
): number {
  // Fidelity F = |⟨ψ|φ⟩|²
  const inner = loop1.innerProduct(loop2);
  return inner.magnitudeSquared();
}
```

#### Why Hilbert Space Matters

1. **Continuous Similarity**: Instead of "3 decisions different", we get 0.73 similarity
2. **Complex Amplitudes**: Phase relationships matter, not just magnitudes
3. **Orthogonality**: Perpendicular states have zero overlap (truly incompatible loops)
4. **Projective Measurements**: We can "ask" the loop about specific aspects

#### Application: Soft Equivalence Classes

Instead of binary hash equality, loops form **fuzzy clusters** in Hilbert space:

```typescript
interface QuantumEquivalenceClass {
  // Centroid in Hilbert space (not just R^n)
  centroidState: Complex[];

  // Membership is continuous, not binary
  membershipFunction(loop: Loop): number;  // 0 to 1

  // Class overlap with other classes
  overlapWith(other: QuantumEquivalenceClass): number;
}
```

#### Narrative Value

> "There were no clean categories. Loop 891 was 70% the same as his time saving the child, 40% the same as his attempt at the bank—and somehow those numbers didn't add up to 110%, they coexisted, quantum-like, in the same memory."

---

### 2.5 Density Matrices: Mixed States for Incomplete Information

A **pure state** |ψ⟩ represents complete information. A **mixed state** (density matrix ρ) represents incomplete knowledge or genuine statistical mixtures.

```
Pure state:  ρ = |ψ⟩⟨ψ|  (rank 1 matrix)

Mixed state: ρ = Σᵢ pᵢ|ψᵢ⟩⟨ψᵢ|  (statistical mixture)
```

#### Application: Uncertain Loop States

When we don't know which loop the protagonist is in:

```typescript
interface DensityMatrix {
  // For N possible loop states, this is an NxN complex matrix
  matrix: Complex[][];

  // Trace must equal 1 for valid density matrix
  trace(): number;

  // Purity: Tr(ρ²), equals 1 for pure state, less for mixed
  purity(): number;

  // von Neumann entropy: measure of uncertainty
  entropy(): number;

  // Measurement in a basis
  measureInBasis(basis: Complex[][]): number[];
}

class MixedLoopState {
  private density: DensityMatrix;

  // The protagonist MIGHT be in loop A, B, or C
  // with different confidences
  constructor(loopProbabilities: Map<string, number>) {
    this.density = this.buildDensityMatrix(loopProbabilities);
  }

  // How uncertain is the current state?
  uncertainty(): number {
    return this.density.entropy();
  }

  // What's the probability of being in a specific loop?
  probability(loopId: string): number {
    // Diagonal elements of density matrix
    return this.density.diagonalElement(loopId);
  }
}
```

#### Narrative Value

> "The memories blurred. He wasn't sure if he was remembering loop 5,000 or 5,001 or some amalgam his mind had constructed. The distinction had lost meaning—he was a mixture of all those selves now, a statistical smear across a thousand almost-identical days."

---

### 2.6 Quantum Walks: Enhanced Graph Traversal

A **classical random walk** on the day graph: at each node, randomly choose an edge with some probability.

A **quantum walk** uses superposition: the walker exists on all paths simultaneously, with amplitudes that interfere.

```typescript
interface QuantumWalker {
  // Position is a superposition over all nodes
  position: Map<string, Complex>;  // node_id -> amplitude

  // One step of the quantum walk
  step(graph: DayGraph, coinOperator: Complex[][]): void;

  // Measure current position
  measure(): string;  // Returns node_id probabilistically

  // Get probability distribution over nodes
  getDistribution(): Map<string, number>;
}

class QuantumGraphWalker implements QuantumWalker {
  position: Map<string, Complex>;

  constructor(startNode: string) {
    this.position = new Map();
    this.position.set(startNode, new Complex(1, 0));
  }

  step(graph: DayGraph, coin: Complex[][]): void {
    const newPosition = new Map<string, Complex>();

    for (const [nodeId, amplitude] of this.position) {
      const edges = graph.getOutgoingEdges(nodeId);
      const n = edges.length;

      // Apply "coin flip" (unitary operator) to decide direction
      // Then interfere at target nodes
      for (let i = 0; i < n; i++) {
        const targetId = edges[i].target_id;
        const contribution = amplitude.multiply(coin[i % coin.length][i % coin.length]);

        const existing = newPosition.get(targetId) ?? new Complex(0, 0);
        newPosition.set(targetId, existing.add(contribution));
      }
    }

    this.position = newPosition;
    this.normalize();
  }
}
```

#### Why Quantum Walks Excel

1. **Faster Spreading**: Quantum walks spread quadratically faster than classical (Grover speedup)
2. **Interference Effects**: Some nodes become "forbidden" through destructive interference
3. **Hitting Time**: Often reaches target faster than classical

#### Application: Finding Optimal Loops

Instead of exhaustively searching for the best path, use quantum walk dynamics:

```typescript
async function findOptimalPath(
  graph: DayGraph,
  start: string,
  target: string,
  criteria: (path: string[]) => number
): Promise<PathResult> {
  const walker = new QuantumGraphWalker(start);

  // Marked node amplitude amplification (Grover-like)
  const oracle = buildOracle(target);
  const diffusion = buildDiffusionOperator(graph);

  for (let i = 0; i < Math.sqrt(graph.nodeCount); i++) {
    walker.applyOracle(oracle);    // Mark target
    walker.applyDiffusion(diffusion);  // Amplify marked
  }

  // Measure: high probability of optimal path
  return walker.measurePath();
}
```

---

### 2.7 Tensor Networks: Efficient Correlation Representation

As loops accumulate, tracking correlations between them becomes exponentially expensive. **Tensor networks** compress this information.

```
Classical: Store full 2^N state vector
Tensor Network: Store O(N) tensors with bounded dimension
```

#### Application: Loop Correlation Networks

```typescript
interface TensorNetwork {
  tensors: Map<string, Tensor>;
  connections: Map<string, string[]>;  // which tensors connect

  // Contract network to compute correlations
  contract(): Tensor;

  // Add a new loop, maintaining efficient representation
  addLoop(loop: Loop): void;

  // Compute correlation between any two loops
  correlation(loop1: string, loop2: string): number;

  // Approximate the network (truncate small singular values)
  compress(maxBondDimension: number): void;
}

class MatrixProductState implements TensorNetwork {
  // Special 1D tensor network structure
  // Can represent N loops with O(N * D²) parameters
  // instead of O(2^N)
  tensors: Tensor[];
  bondDimension: number;

  // Efficient computation of local observables
  expectation(observable: Operator, site: number): number;

  // Entanglement entropy between loops
  entanglementEntropy(partition: number): number;
}
```

#### Narrative Value

> "The loops weren't independent. They formed a network of implications, each one constraining what was possible in the others. The system kept only the essential correlations, letting the noise fade into probability."

---

### 2.8 Quantum Probability: Beyond Kolmogorov

Classical probability obeys Kolmogorov axioms. Quantum probability allows:
- **Negative probabilities** (quasi-probabilities)
- **Non-commutative observables**
- **Contextuality** (outcome depends on what else is measured)

#### Application: "Impossible" Loop Statistics

Some narrative situations defy classical probability:

```typescript
interface QuantumProbabilitySpace {
  // Observables that don't commute
  observables: Map<string, HermitianMatrix>;

  // Measure observable A then B gives different result than B then A
  measure(observableA: string, observableB: string): number;
  measureReverse(observableA: string, observableB: string): number;

  // Wigner function: quasi-probability that can be negative
  wignerFunction(state: QuantumLoopState, x: number, p: number): number;
}
```

#### The Three-Box Paradox in Loops

Consider three possible locations (A, B, C) the protagonist could be. Quantum mechanics allows:
- If you check A: 100% find them there
- If you check B: 100% find them there
- If you check C: 100% find them there

But they can only be in one! This is the **three-box paradox**.

In loop narrative terms:
> "No matter which timeline the observer enters, the protagonist is there. But the protagonist cannot be in all timelines simultaneously. Unless... the act of observation itself creates the presence."

---

## Part III: Implementation Architecture

### 3.1 Hybrid Classical-Quantum Data Model

```typescript
// Extended Loop with quantum properties
interface QuantumLoop extends Loop {
  // Classical fields inherited from Loop

  // Quantum extensions
  quantum?: {
    // Superposition with other loops
    superposition?: {
      amplitudes: Map<string, Complex>;
      collapsed: boolean;
    };

    // Entanglement relationships
    entangled?: {
      pairs: EntangledPair[];
    };

    // Hilbert space representation
    hilbertState?: Complex[];

    // Interference contributions
    interference?: {
      constructive: string[];  // loop IDs that reinforce
      destructive: string[];   // loop IDs that cancel
    };
  };
}
```

### 3.2 Quantum Equivalence Engine

```typescript
class QuantumEquivalenceEngine extends EquivalenceEngine {

  // Override: Use quantum fidelity instead of hash equality
  computeQuantumSimilarity(loop1: Loop, loop2: Loop): number {
    const state1 = this.toHilbertState(loop1);
    const state2 = this.toHilbertState(loop2);

    return this.fidelity(state1, state2);
  }

  // Fuzzy clustering based on quantum distance
  async assignToQuantumClass(loop: Loop): Promise<QuantumEquivalenceClass[]> {
    const classes = await this.store.getAllQuantumClasses();
    const memberships: Array<{ class: QuantumEquivalenceClass; weight: number }> = [];

    for (const qc of classes) {
      const similarity = this.computeQuantumSimilarity(loop, qc.representative);
      if (similarity > 0.1) {  // Threshold
        memberships.push({ class: qc, weight: similarity });
      }
    }

    // Loop can belong to MULTIPLE classes with different weights
    return memberships;
  }

  // Compute interference between equivalence classes
  classInterference(class1: string, class2: string): InterferenceResult {
    // Returns constructive/destructive/neutral
  }
}
```

### 3.3 Quantum Operators

```typescript
// Quantum-enhanced cause operator
class QuantumCauseOperator extends CauseOperator {

  execute(context: QuantumOperatorContext): QuantumOperatorResult {
    const { graph, target, previousLoops } = context;

    // Use quantum walk to find optimal paths
    const walker = new QuantumGraphWalker(graph.startNodeId);

    // Apply Grover-like amplitude amplification for target
    this.amplifyTarget(walker, target);

    // Get probability distribution over paths
    const pathDistribution = walker.getPathDistribution();

    // Return superposition of suggested paths
    return {
      success: true,
      superposedPaths: pathDistribution,
      interferenceWarnings: this.detectDestructiveInterference(pathDistribution),
      suggestedCollapse: this.recommendMeasurement(pathDistribution),
    };
  }
}
```

---

## Part IV: Narrative Applications

### 4.1 Schrödinger's Loop

A loop exists in superposition until narrated:

```typescript
class SchrodingerLoop {
  private state: QuantumLoopState;
  private collapsed: boolean = false;

  // The loop exists in all possibilities
  constructor(possibleLoops: Loop[]) {
    const n = possibleLoops.length;
    const amplitude = new Complex(1 / Math.sqrt(n), 0);

    this.state = new QuantumLoopState();
    for (const loop of possibleLoops) {
      this.state.setAmplitude(loop.id, amplitude);
    }
  }

  // Writing the loop collapses it
  narrate(): Loop {
    if (this.collapsed) {
      throw new Error("Loop already narrated");
    }

    const selected = this.state.measure();
    this.collapsed = true;
    return selected;
  }

  // Peek without full collapse
  partialObserve(property: string): any {
    // Weak measurement - partial collapse
    return this.state.weakMeasure(property);
  }
}
```

### 4.2 Entangled Character Pairs

Two characters whose fates are quantum-correlated:

```typescript
class EntangledCharacters {
  private bellState: 'singlet' | 'triplet';

  // In singlet state: if A lives, B dies; if A dies, B lives
  // In triplet state: both share the same fate

  measureFate(characterA: string): 'alive' | 'dead' {
    const result = Math.random() < 0.5 ? 'alive' : 'dead';

    if (this.bellState === 'singlet') {
      this.setOtherFate(characterA, result === 'alive' ? 'dead' : 'alive');
    } else {
      this.setOtherFate(characterA, result);
    }

    return result;
  }
}
```

### 4.3 Interference Zones

Regions of the day graph where paths destructively interfere:

```typescript
class InterferenceZone {
  nodes: Set<string>;

  // Loops entering this zone from multiple directions cancel
  computeResultingProbability(incomingPaths: PathAmplitude[]): number {
    let totalAmplitude = new Complex(0, 0);

    for (const path of incomingPaths) {
      totalAmplitude = totalAmplitude.add(path.amplitude);
    }

    // Can be near zero even with many incoming paths!
    return totalAmplitude.magnitudeSquared();
  }

  // Returns true if paths will cancel
  willPathsCancel(paths: PathAmplitude[]): boolean {
    return this.computeResultingProbability(paths) < 0.01;
  }
}
```

---

## Part V: Mathematical Formalism

### 5.1 The Loop Hilbert Space

Let ℋ_L be the Hilbert space of all possible loops:

```
ℋ_L = span{|L_i⟩ : i ∈ LoopIDs}

Inner product: ⟨L_i|L_j⟩ = δ_ij for orthonormal basis

General state: |Ψ⟩ = Σᵢ αᵢ|Lᵢ⟩ where Σᵢ|αᵢ|² = 1
```

### 5.2 The Decision Operator

For each decision point d, define operator D̂_d:

```
D̂_d|L⟩ = choice_value(L, d)|L⟩

Eigenstates are loops that made specific choice at d
```

### 5.3 The Time Evolution

Loops evolve according to a Hamiltonian Ĥ:

```
|Ψ(t)⟩ = e^(-iĤt/ℏ)|Ψ(0)⟩

where Ĥ encodes the graph structure and transition probabilities
```

### 5.4 Entanglement Measures

For a bipartite system of loops:

```
Entanglement Entropy: S(ρ_A) = -Tr(ρ_A log ρ_A)

where ρ_A = Tr_B(|Ψ⟩⟨Ψ|) is the reduced density matrix
```

---

## Part VI: Implementation Roadmap

### Phase 1: Quantum Data Structures
- [ ] Implement Complex number class
- [ ] Implement Hilbert space vectors
- [ ] Implement density matrices
- [ ] Add quantum properties to Loop interface

### Phase 2: Quantum Equivalence
- [ ] Replace hash-based equivalence with fidelity-based clustering
- [ ] Implement fuzzy class membership
- [ ] Add interference detection between classes

### Phase 3: Quantum Operators
- [ ] Implement quantum walk on DayGraph
- [ ] Add superposition support to all operators
- [ ] Implement amplitude amplification for path finding

### Phase 4: Entanglement System
- [ ] Design entanglement data model
- [ ] Implement Bell state correlations
- [ ] Add collapse propagation

### Phase 5: Tensor Network Compression
- [ ] Implement basic tensor operations
- [ ] Build Matrix Product State representation
- [ ] Add correlation computation

### Phase 6: Narrative Integration
- [ ] Create quantum-aware template engine
- [ ] Implement superposition narration
- [ ] Add interference zone visualization

---

## Part VII: Philosophical Implications

### The Observer Effect

In quantum mechanics, observation changes the system. In loop narratives:
- **The reader** is the observer
- **Narrating** a loop collapses its superposition
- **Unwritten loops** remain in potentiality

### Many-Worlds in Fiction

Each decision creates a branch. The quantum formalism provides:
- A way to track all branches simultaneously
- A mechanism for branches to interfere
- A mathematical framework for branch "weight"

### The Narrative Wave Function

The "true state" of the story is not any single loop, but the wave function over all loops. The story we tell is just one measurement of that infinite potential.

---

## Conclusion

Quantum mathematical formalisms offer powerful tools for the Loop Engine:

| Classical Limitation | Quantum Solution |
|---------------------|------------------|
| Binary equivalence | Continuous fidelity |
| Independent loops | Entanglement |
| Simple probabilities | Interference effects |
| Exhaustive search | Quantum walks |
| Exponential correlations | Tensor networks |
| Definite states | Superposition |

By implementing these concepts in classical code, we gain:
1. **Expressiveness**: Model "impossible" narrative situations
2. **Efficiency**: Compress exponential state spaces
3. **Elegance**: Unified mathematical framework
4. **Depth**: Physics-inspired narrative mechanics

The Loop Engine becomes not just a tracking system, but a **quantum narrative simulator**—a machine for exploring the infinite possibility space of looping stories.

---

*"The loops were never separate. They were all one wave, interfering with itself through time, and what we called 'the story' was just where the amplitudes added up to something we could see."*
