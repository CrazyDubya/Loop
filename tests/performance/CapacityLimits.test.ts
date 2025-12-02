/**
 * Tests for capacity limits and reporting
 */

import {
  SMALL_PROJECT,
  MEDIUM_PROJECT,
  LARGE_PROJECT,
  KNOWN_LIMITATIONS,
  getCapacityProfile,
  checkCapacity,
  formatCapacityReport,
} from '../../src/performance/CapacityLimits';

describe('Capacity Profiles', () => {
  describe('profile definitions', () => {
    it('should define small project profile', () => {
      expect(SMALL_PROJECT.name).toBe('small');
      expect(SMALL_PROJECT.limits.maxLoopsInMemory).toBe(100);
      expect(SMALL_PROJECT.limits.maxNodes).toBe(50);
      expect(SMALL_PROJECT.recommendations.length).toBeGreaterThan(0);
    });

    it('should define medium project profile', () => {
      expect(MEDIUM_PROJECT.name).toBe('medium');
      expect(MEDIUM_PROJECT.limits.maxLoopsInMemory).toBe(1000);
      expect(MEDIUM_PROJECT.limits.maxNodes).toBe(200);
    });

    it('should define large project profile', () => {
      expect(LARGE_PROJECT.name).toBe('large');
      expect(LARGE_PROJECT.limits.maxLoopsInMemory).toBe(10000);
      expect(LARGE_PROJECT.limits.maxNodes).toBe(500);
    });

    it('should have increasing limits across profiles', () => {
      expect(SMALL_PROJECT.limits.maxLoopsInMemory)
        .toBeLessThan(MEDIUM_PROJECT.limits.maxLoopsInMemory);
      expect(MEDIUM_PROJECT.limits.maxLoopsInMemory)
        .toBeLessThan(LARGE_PROJECT.limits.maxLoopsInMemory);
    });
  });

  describe('known limitations', () => {
    it('should document what system cannot handle', () => {
      expect(KNOWN_LIMITATIONS.noGoodFor.length).toBeGreaterThan(0);
      // Check that at least one item mentions multiplayer, concurrent, or distributed
      const hasRelevantLimitation = KNOWN_LIMITATIONS.noGoodFor.some(
        item => /multiplayer|concurrent|distributed/i.test(item)
      );
      expect(hasRelevantLimitation).toBe(true);
    });

    it('should document performance degradation scenarios', () => {
      expect(KNOWN_LIMITATIONS.performanceDegradation.length).toBeGreaterThan(0);

      for (const scenario of KNOWN_LIMITATIONS.performanceDegradation) {
        expect(scenario.scenario).toBeDefined();
        expect(scenario.impact).toBeDefined();
        expect(scenario.mitigation).toBeDefined();
      }
    });

    it('should list future considerations', () => {
      expect(KNOWN_LIMITATIONS.futureConsiderations.length).toBeGreaterThan(0);
    });
  });
});

describe('getCapacityProfile', () => {
  it('should return small profile for <= 100 loops', () => {
    expect(getCapacityProfile(0).name).toBe('small');
    expect(getCapacityProfile(50).name).toBe('small');
    expect(getCapacityProfile(100).name).toBe('small');
  });

  it('should return medium profile for 101-1000 loops', () => {
    expect(getCapacityProfile(101).name).toBe('medium');
    expect(getCapacityProfile(500).name).toBe('medium');
    expect(getCapacityProfile(1000).name).toBe('medium');
  });

  it('should return large profile for > 1000 loops', () => {
    expect(getCapacityProfile(1001).name).toBe('large');
    expect(getCapacityProfile(5000).name).toBe('large');
    expect(getCapacityProfile(10000).name).toBe('large');
  });
});

describe('checkCapacity', () => {
  describe('safe projects', () => {
    it('should pass for small projects within limits', () => {
      const result = checkCapacity({
        nodeCount: 20,
        edgeCount: 50,
        loopCount: 50,
      });

      expect(result.safe).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.profile.name).toBe('small');
    });

    it('should pass for medium projects within limits', () => {
      const result = checkCapacity({
        nodeCount: 150,
        edgeCount: 800,
        loopCount: 800,
      });

      expect(result.safe).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('warnings', () => {
    it('should warn when nodes exceed limit but not by 2x', () => {
      const result = checkCapacity({
        nodeCount: 75, // 1.5x limit of 50
        edgeCount: 50,
        loopCount: 50,
      });

      expect(result.safe).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Node count');
    });

    it('should warn when edges exceed limit', () => {
      const result = checkCapacity({
        nodeCount: 30,
        edgeCount: 300, // 1.5x limit of 200
        loopCount: 50,
      });

      expect(result.safe).toBe(true);
      expect(result.warnings.some(w => w.includes('Edge count'))).toBe(true);
    });

    it('should warn about max decisions per loop', () => {
      const result = checkCapacity({
        nodeCount: 30,
        edgeCount: 50,
        loopCount: 50,
        maxDecisions: 100, // Exceeds 50 limit
      });

      expect(result.warnings.some(w => w.includes('decisions'))).toBe(true);
    });

    it('should warn about max knowledge items', () => {
      const result = checkCapacity({
        nodeCount: 30,
        edgeCount: 50,
        loopCount: 50,
        maxKnowledge: 150, // Exceeds 100 limit
      });

      expect(result.warnings.some(w => w.includes('knowledge'))).toBe(true);
    });
  });

  describe('errors', () => {
    it('should error when nodes far exceed limit (2x+)', () => {
      const result = checkCapacity({
        nodeCount: 150, // 3x limit of 50
        edgeCount: 50,
        loopCount: 50,
      });

      expect(result.safe).toBe(false);
      expect(result.errors.some(e => e.includes('Node count'))).toBe(true);
    });

    it('should error when edges far exceed limit', () => {
      const result = checkCapacity({
        nodeCount: 30,
        edgeCount: 500, // 2.5x limit of 200
        loopCount: 50,
      });

      expect(result.safe).toBe(false);
      expect(result.errors.some(e => e.includes('Edge count'))).toBe(true);
    });

    it('should error when loops exceed memory limit', () => {
      // Need >10000 loops to exceed large profile's limit
      const result = checkCapacity({
        nodeCount: 30,
        edgeCount: 50,
        loopCount: 15000, // Exceeds large profile's 10000 limit
      });

      expect(result.safe).toBe(false);
      expect(result.errors.some(e => e.includes('Loop count'))).toBe(true);
    });
  });
});

describe('formatCapacityReport', () => {
  it('should format a passing report', () => {
    const report = formatCapacityReport({
      nodeCount: 20,
      edgeCount: 50,
      loopCount: 50,
    });

    expect(report).toContain('Capacity Report');
    expect(report).toContain('Profile: small');
    expect(report).toContain('Nodes: 20 / 50');
    expect(report).toContain('All capacity checks passed');
    expect(report).toContain('Recommendations');
  });

  it('should format warnings', () => {
    const report = formatCapacityReport({
      nodeCount: 75,
      edgeCount: 50,
      loopCount: 50,
    });

    expect(report).toContain('Warnings');
    expect(report).toContain('⚠');
  });

  it('should format errors', () => {
    const report = formatCapacityReport({
      nodeCount: 200,
      edgeCount: 50,
      loopCount: 50,
    });

    expect(report).toContain('ERRORS');
    expect(report).toContain('✗');
  });

  it('should show current usage vs limits', () => {
    const report = formatCapacityReport({
      nodeCount: 30,
      edgeCount: 100,
      loopCount: 80,
    });

    expect(report).toContain('Current Usage');
    expect(report).toMatch(/Nodes: 30 \/ \d+/);
    expect(report).toMatch(/Edges: 100 \/ \d+/);
    expect(report).toMatch(/Loops: 80 \/ \d+/);
  });
});
