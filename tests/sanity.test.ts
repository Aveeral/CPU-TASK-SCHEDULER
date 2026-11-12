// Phase 0 sanity check — this test simply verifies the test runner is working.
// It will be replaced with real engine tests in Phase 1.

import { describe, it, expect } from 'vitest';

describe('Phase 0 – Test runner sanity', () => {
  it('should confirm the test environment is operational', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle basic string operations', () => {
    const projectName = 'task-scheduler';
    expect(projectName).toContain('scheduler');
  });

  it('should validate Vitest globals are available', () => {
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });
});
