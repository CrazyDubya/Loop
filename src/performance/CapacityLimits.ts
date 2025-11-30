/**
 * CapacityLimits - Honest documentation of system performance limits
 *
 * This module provides transparent documentation of what the Loop Engine
 * can and cannot handle efficiently. These are HONEST limits based on
 * reasonable assumptions, not marketing claims.
 */

export interface CapacityProfile {
  name: string;
  description: string;
  limits: CapacityLimits;
  recommendations: string[];
}

export interface CapacityLimits {
  // Graph limits
  maxNodes: number;
  maxEdges: number;
  maxPathDepth: number;

  // Loop limits
  maxLoopsInMemory: number;
  maxDecisionsPerLoop: number;
  maxKnowledgeItemsPerLoop: number;

  // Equivalence limits
  maxEquivalenceClasses: number;
  maxLoopsPerClass: number;

  // Query limits
  maxResultsPerQuery: number;
  maxConcurrentQueries: number;

  // Narrative limits
  maxLoopsPerMontage: number;
  maxLoopsPerChapter: number;

  // Performance targets
  targetQueryLatencyMs: number;
  targetNarrationLatencyMs: number;
}

/**
 * Small project profile (prototyping, short stories)
 */
export const SMALL_PROJECT: CapacityProfile = {
  name: 'small',
  description: 'Suitable for prototyping and short stories (< 100 loops)',
  limits: {
    maxNodes: 50,
    maxEdges: 200,
    maxPathDepth: 20,
    maxLoopsInMemory: 100,
    maxDecisionsPerLoop: 50,
    maxKnowledgeItemsPerLoop: 100,
    maxEquivalenceClasses: 25,
    maxLoopsPerClass: 10,
    maxResultsPerQuery: 100,
    maxConcurrentQueries: 5,
    maxLoopsPerMontage: 10,
    maxLoopsPerChapter: 25,
    targetQueryLatencyMs: 10,
    targetNarrationLatencyMs: 50,
  },
  recommendations: [
    'Use in-memory storage for best performance',
    'All loops can be loaded simultaneously',
    'Full graph traversal is fast',
    'No pagination needed for most queries',
  ],
};

/**
 * Medium project profile (novellas, games with moderate complexity)
 */
export const MEDIUM_PROJECT: CapacityProfile = {
  name: 'medium',
  description: 'Suitable for novellas and moderate games (100-1000 loops)',
  limits: {
    maxNodes: 200,
    maxEdges: 1000,
    maxPathDepth: 50,
    maxLoopsInMemory: 1000,
    maxDecisionsPerLoop: 100,
    maxKnowledgeItemsPerLoop: 250,
    maxEquivalenceClasses: 100,
    maxLoopsPerClass: 25,
    maxResultsPerQuery: 500,
    maxConcurrentQueries: 10,
    maxLoopsPerMontage: 25,
    maxLoopsPerChapter: 50,
    targetQueryLatencyMs: 50,
    targetNarrationLatencyMs: 200,
  },
  recommendations: [
    'Consider caching for frequently accessed equivalence classes',
    'Use pagination for loop listings',
    'Index loops by status and outcome for faster filtering',
    'Pre-compute knowledge hashes',
  ],
};

/**
 * Large project profile (novels, complex games)
 */
export const LARGE_PROJECT: CapacityProfile = {
  name: 'large',
  description: 'Suitable for novels and complex games (1000-10000 loops)',
  limits: {
    maxNodes: 500,
    maxEdges: 5000,
    maxPathDepth: 100,
    maxLoopsInMemory: 10000,
    maxDecisionsPerLoop: 200,
    maxKnowledgeItemsPerLoop: 500,
    maxEquivalenceClasses: 500,
    maxLoopsPerClass: 50,
    maxResultsPerQuery: 1000,
    maxConcurrentQueries: 20,
    maxLoopsPerMontage: 50,
    maxLoopsPerChapter: 100,
    targetQueryLatencyMs: 100,
    targetNarrationLatencyMs: 500,
  },
  recommendations: [
    'REQUIRED: Use lazy loading for loop collections',
    'REQUIRED: Implement LRU caching for hot paths',
    'Use batch loading for related entities',
    'Consider persistent storage for loops',
    'Pre-compute and cache equivalence classes',
    'Use streaming for large result sets',
  ],
};

/**
 * What we CANNOT handle well (honest limitations)
 */
export const KNOWN_LIMITATIONS = {
  noGoodFor: [
    'Real-time multiplayer synchronization (no network layer)',
    'Loops with >500 decision points (memory and performance)',
    'Graphs with >10000 edges (path finding becomes slow)',
    'Concurrent writes from multiple processes (no locking)',
    'Persistent storage (in-memory only currently)',
    'Distributed systems (single-process only)',
    'Undo/redo history (no built-in support)',
    'Version control of loop states (no diff/merge)',
  ],

  performanceDegradation: [
    {
      scenario: 'Path finding with >100 nodes',
      impact: 'Linear slowdown, may take >100ms',
      mitigation: 'Cache frequently used paths',
    },
    {
      scenario: 'Equivalence detection with >1000 loops',
      impact: 'O(n²) comparison time',
      mitigation: 'Pre-compute hashes, use batch processing',
    },
    {
      scenario: 'Narrative generation for >50 loops',
      impact: 'Template processing slows significantly',
      mitigation: 'Generate incrementally, cache results',
    },
    {
      scenario: 'Contradiction detection with complex graphs',
      impact: 'Exponential complexity in worst case',
      mitigation: 'Run validation incrementally on changes',
    },
  ],

  futureConsiderations: [
    'SQLite or file-based persistence layer',
    'Worker threads for CPU-intensive operations',
    'Incremental validation (only check changed entities)',
    'Compressed storage for large knowledge sets',
    'Lazy graph loading for very large DAGs',
  ],
};

/**
 * Get the appropriate capacity profile for a project size
 */
export function getCapacityProfile(loopCount: number): CapacityProfile {
  if (loopCount <= 100) {
    return SMALL_PROJECT;
  } else if (loopCount <= 1000) {
    return MEDIUM_PROJECT;
  } else {
    return LARGE_PROJECT;
  }
}

/**
 * Check if a project is within safe capacity limits
 */
export function checkCapacity(stats: {
  nodeCount: number;
  edgeCount: number;
  loopCount: number;
  maxDecisions?: number;
  maxKnowledge?: number;
}): {
  safe: boolean;
  warnings: string[];
  errors: string[];
  profile: CapacityProfile;
} {
  const profile = getCapacityProfile(stats.loopCount);
  const limits = profile.limits;
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check nodes
  if (stats.nodeCount > limits.maxNodes) {
    if (stats.nodeCount > limits.maxNodes * 2) {
      errors.push(`Node count (${stats.nodeCount}) far exceeds limit (${limits.maxNodes})`);
    } else {
      warnings.push(`Node count (${stats.nodeCount}) exceeds recommended limit (${limits.maxNodes})`);
    }
  }

  // Check edges
  if (stats.edgeCount > limits.maxEdges) {
    if (stats.edgeCount > limits.maxEdges * 2) {
      errors.push(`Edge count (${stats.edgeCount}) far exceeds limit (${limits.maxEdges})`);
    } else {
      warnings.push(`Edge count (${stats.edgeCount}) exceeds recommended limit (${limits.maxEdges})`);
    }
  }

  // Check loops
  if (stats.loopCount > limits.maxLoopsInMemory) {
    errors.push(`Loop count (${stats.loopCount}) exceeds memory limit (${limits.maxLoopsInMemory})`);
  }

  // Check decisions per loop
  if (stats.maxDecisions && stats.maxDecisions > limits.maxDecisionsPerLoop) {
    warnings.push(`Max decisions per loop (${stats.maxDecisions}) exceeds limit (${limits.maxDecisionsPerLoop})`);
  }

  // Check knowledge per loop
  if (stats.maxKnowledge && stats.maxKnowledge > limits.maxKnowledgeItemsPerLoop) {
    warnings.push(`Max knowledge items (${stats.maxKnowledge}) exceeds limit (${limits.maxKnowledgeItemsPerLoop})`);
  }

  return {
    safe: errors.length === 0,
    warnings,
    errors,
    profile,
  };
}

/**
 * Format capacity report for display
 */
export function formatCapacityReport(stats: {
  nodeCount: number;
  edgeCount: number;
  loopCount: number;
  maxDecisions?: number;
  maxKnowledge?: number;
}): string {
  const check = checkCapacity(stats);
  const lines: string[] = [];

  lines.push('=== Capacity Report ===');
  lines.push(`Profile: ${check.profile.name} (${check.profile.description})`);
  lines.push('');
  lines.push('Current Usage:');
  lines.push(`  Nodes: ${stats.nodeCount} / ${check.profile.limits.maxNodes}`);
  lines.push(`  Edges: ${stats.edgeCount} / ${check.profile.limits.maxEdges}`);
  lines.push(`  Loops: ${stats.loopCount} / ${check.profile.limits.maxLoopsInMemory}`);

  if (check.errors.length > 0) {
    lines.push('');
    lines.push('ERRORS:');
    for (const err of check.errors) {
      lines.push(`  ✗ ${err}`);
    }
  }

  if (check.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warn of check.warnings) {
      lines.push(`  ⚠ ${warn}`);
    }
  }

  if (check.safe && check.warnings.length === 0) {
    lines.push('');
    lines.push('✓ All capacity checks passed');
  }

  lines.push('');
  lines.push('Recommendations:');
  for (const rec of check.profile.recommendations) {
    lines.push(`  • ${rec}`);
  }

  return lines.join('\n');
}
