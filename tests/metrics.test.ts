// ============================================================
// metrics.test.ts — Phase 3: Metrics verification
//
// Every expected value is hand-calculated from docs/test-cases.md.
// Tests cover computeProcessMetrics, computeAggregateMetrics,
// and end-to-end metric correctness via runSimulation.
// ============================================================

import { describe, it, expect } from 'vitest';
import { createPCB, clonePCB } from '../src/engine/pcb';
import {
  computeProcessMetrics,
  computeAggregateMetrics,
  round,
  formatMetrics,
  formatProcessMetrics,
} from '../src/engine/metrics';
import { runSimulation, defaultConfig } from '../src/engine/simulator';
import { fcfsScheduler }  from '../src/engine/algorithms/fcfs';
import { ProcessState }   from '../src/engine/types';

const cfg = defaultConfig({ algorithm: 'FCFS', contextSwitchCost: 0 });

// ─────────────────────────────────────────────
// Unit tests: computeProcessMetrics
// ─────────────────────────────────────────────

describe('computeProcessMetrics — unit', () => {
  it('computes TAT = completion − arrival', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 2, burstTime: 5 });
    p.startTime      = 2;
    p.completionTime = 10;
    computeProcessMetrics(p);
    expect(p.turnaroundTime).toBe(8); // 10 - 2
  });

  it('computes WT = TAT − burst', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 2, burstTime: 5 });
    p.startTime      = 2;
    p.completionTime = 10;
    computeProcessMetrics(p);
    expect(p.waitingTime).toBe(3); // 8 - 5
  });

  it('computes RT = startTime − arrival', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 2, burstTime: 5 });
    p.startTime      = 7;
    p.completionTime = 10;
    computeProcessMetrics(p);
    expect(p.responseTime).toBe(5); // 7 - 2
  });

  it('RT = 0 when process starts on arrival', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 });
    p.startTime      = 0;
    p.completionTime = 5;
    computeProcessMetrics(p);
    expect(p.responseTime).toBe(0);
    expect(p.waitingTime).toBe(0);
  });

  it('is a no-op for incomplete processes (completionTime null)', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 });
    computeProcessMetrics(p);
    expect(p.turnaroundTime).toBeNull();
    expect(p.waitingTime).toBeNull();
    expect(p.responseTime).toBeNull();
  });

  it('is a no-op when startTime is null', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 });
    p.completionTime = 5;
    computeProcessMetrics(p);
    expect(p.turnaroundTime).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Unit tests: computeAggregateMetrics
// ─────────────────────────────────────────────

describe('computeAggregateMetrics — unit', () => {
  it('averages waiting time correctly', () => {
    const p1 = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    const p2 = createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 3 });
    p1.startTime = 0;  p1.completionTime = 3;  // WT=0
    p2.startTime = 3;  p2.completionTime = 6;  // WT=3
    const m = computeAggregateMetrics([p1, p2], 6, 6, 2);
    expect(m.avgWaitingTime).toBeCloseTo(1.5);
  });

  it('CPU utilization = 100% when no idle ticks', () => {
    const p1 = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 });
    p1.startTime = 0; p1.completionTime = 5;
    const m = computeAggregateMetrics([p1], 5, 5, 1);
    expect(m.cpuUtilization).toBeCloseTo(100);
  });

  it('CPU utilization < 100% when there are idle ticks', () => {
    // 5 busy ticks out of 8 total (3 idle)
    const p1 = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 2 });
    const p2 = createPCB({ pid: 2, name: 'P2', arrivalTime: 5, burstTime: 3 });
    p1.startTime = 0; p1.completionTime = 2;
    p2.startTime = 5; p2.completionTime = 8;
    const m = computeAggregateMetrics([p1, p2], 5, 8, 2);
    expect(m.cpuUtilization).toBeCloseTo(62.5);
  });

  it('throughput = processes / totalTime', () => {
    const p1 = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 });
    p1.startTime = 0; p1.completionTime = 5;
    const m = computeAggregateMetrics([p1], 5, 5, 1);
    expect(m.throughput).toBeCloseTo(1 / 5);
  });

  it('returns all zeros for empty process list', () => {
    const m = computeAggregateMetrics([], 0, 0, 0);
    expect(m.avgWaitingTime).toBe(0);
    expect(m.avgTurnaroundTime).toBe(0);
    expect(m.avgResponseTime).toBe(0);
    expect(m.cpuUtilization).toBe(0);
    expect(m.throughput).toBe(0);
  });

  it('context switch count is preserved', () => {
    const p1 = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 });
    p1.startTime = 0; p1.completionTime = 5;
    const m = computeAggregateMetrics([p1], 5, 5, 42);
    expect(m.contextSwitches).toBe(42);
  });

  it('calls computeProcessMetrics for each process automatically', () => {
    // Processes start with null metrics — computeAggregateMetrics should fill them
    const p1 = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 });
    p1.startTime = 0; p1.completionTime = 5;
    expect(p1.turnaroundTime).toBeNull(); // not yet computed
    computeAggregateMetrics([p1], 5, 5, 1);
    expect(p1.turnaroundTime).toBe(5);   // now filled in
    expect(p1.waitingTime).toBe(0);
    expect(p1.responseTime).toBe(0);
  });
});

// ─────────────────────────────────────────────
// End-to-end: TC-1 from test-cases.md
// FCFS — classic 3-process (textbook example)
//
// PID | Arrival | Burst
//  P1 |    0    |  24   → TAT=24, WT=0,  RT=0
//  P2 |    1    |   3   → TAT=26, WT=23, RT=23
//  P3 |    2    |   3   → TAT=28, WT=25, RT=25
//
// Avg WT = 16, Avg TAT = 26, Avg RT = 16
// ─────────────────────────────────────────────
describe('TC-1: FCFS 3-process — exact metric verification', () => {
  const result = runSimulation(
    [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 24 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 1, burstTime: 3  }),
      createPCB({ pid: 3, name: 'P3', arrivalTime: 2, burstTime: 3  }),
    ],
    fcfsScheduler,
    cfg
  );

  it('P1 — completionTime=24', () => {
    expect(result.processes.find(p => p.pid === 1)!.completionTime).toBe(24);
  });
  it('P1 — TAT=24', () => {
    expect(result.processes.find(p => p.pid === 1)!.turnaroundTime).toBe(24);
  });
  it('P1 — WT=0', () => {
    expect(result.processes.find(p => p.pid === 1)!.waitingTime).toBe(0);
  });
  it('P1 — RT=0', () => {
    expect(result.processes.find(p => p.pid === 1)!.responseTime).toBe(0);
  });

  it('P2 — completionTime=27', () => {
    expect(result.processes.find(p => p.pid === 2)!.completionTime).toBe(27);
  });
  it('P2 — TAT=26', () => {
    expect(result.processes.find(p => p.pid === 2)!.turnaroundTime).toBe(26);
  });
  it('P2 — WT=23', () => {
    expect(result.processes.find(p => p.pid === 2)!.waitingTime).toBe(23);
  });
  it('P2 — RT=23', () => {
    expect(result.processes.find(p => p.pid === 2)!.responseTime).toBe(23);
  });

  it('P3 — completionTime=30', () => {
    expect(result.processes.find(p => p.pid === 3)!.completionTime).toBe(30);
  });
  it('P3 — TAT=28', () => {
    expect(result.processes.find(p => p.pid === 3)!.turnaroundTime).toBe(28);
  });
  it('P3 — WT=25', () => {
    expect(result.processes.find(p => p.pid === 3)!.waitingTime).toBe(25);
  });
  it('P3 — RT=25', () => {
    expect(result.processes.find(p => p.pid === 3)!.responseTime).toBe(25);
  });

  it('Avg WT = 16', () => {
    expect(result.metrics.avgWaitingTime).toBeCloseTo(16, 5);
  });
  it('Avg TAT = 26', () => {
    expect(result.metrics.avgTurnaroundTime).toBeCloseTo(26, 5);
  });
  it('Avg RT = 16', () => {
    expect(result.metrics.avgResponseTime).toBeCloseTo(16, 5);
  });
  it('CPU utilization = 100% (no idle)', () => {
    expect(result.metrics.cpuUtilization).toBeCloseTo(100, 1);
  });
  it('Total time = 30', () => {
    expect(result.metrics.totalTime).toBe(30);
  });
  it('Throughput = 3/30 = 0.1', () => {
    expect(result.metrics.throughput).toBeCloseTo(0.1, 5);
  });
});

// ─────────────────────────────────────────────
// End-to-end: TC-2 from test-cases.md
// FCFS — CPU idle gap
//
// PID | Arrival | Burst
//  P1 |    0    |   2   → TAT=2, WT=0, RT=0
//  P2 |    5    |   3   → TAT=3, WT=0, RT=0
//
// CPU utilization = 5/8 = 62.5%
// ─────────────────────────────────────────────
describe('TC-2: FCFS idle gap — exact metric verification', () => {
  const result = runSimulation(
    [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 2 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 5, burstTime: 3 }),
    ],
    fcfsScheduler,
    cfg
  );

  it('P1 — TAT=2, WT=0, RT=0', () => {
    const p = result.processes.find(p => p.pid === 1)!;
    expect(p.turnaroundTime).toBe(2);
    expect(p.waitingTime).toBe(0);
    expect(p.responseTime).toBe(0);
  });

  it('P2 — TAT=3, WT=0, RT=0', () => {
    const p = result.processes.find(p => p.pid === 2)!;
    expect(p.turnaroundTime).toBe(3);
    expect(p.waitingTime).toBe(0);
    expect(p.responseTime).toBe(0);
  });

  it('Avg WT = 0', () => {
    expect(result.metrics.avgWaitingTime).toBe(0);
  });
  it('Avg TAT = 2.5', () => {
    expect(result.metrics.avgTurnaroundTime).toBeCloseTo(2.5, 5);
  });
  it('CPU utilization = 62.5%', () => {
    expect(result.metrics.cpuUtilization).toBeCloseTo(62.5, 5);
  });
  it('Total time = 8', () => {
    expect(result.metrics.totalTime).toBe(8);
  });
  it('Throughput = 2/8 = 0.25', () => {
    expect(result.metrics.throughput).toBeCloseTo(0.25, 5);
  });
});

// ─────────────────────────────────────────────
// End-to-end: TC-7 from test-cases.md
// Single process
//
// PID | Arrival | Burst
//  P1 |    0    |   5   → TAT=5, WT=0, RT=0
// ─────────────────────────────────────────────
describe('TC-7: Single process — metric verification', () => {
  const result = runSimulation(
    [createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 })],
    fcfsScheduler,
    cfg
  );

  it('TAT=5, WT=0, RT=0', () => {
    const p = result.processes[0];
    expect(p.turnaroundTime).toBe(5);
    expect(p.waitingTime).toBe(0);
    expect(p.responseTime).toBe(0);
  });

  it('CPU utilization = 100%', () => {
    expect(result.metrics.cpuUtilization).toBeCloseTo(100, 1);
  });

  it('Throughput = 1/5 = 0.2', () => {
    expect(result.metrics.throughput).toBeCloseTo(0.2, 5);
  });

  it('Total time = 5', () => {
    expect(result.metrics.totalTime).toBe(5);
  });
});

// ─────────────────────────────────────────────
// Late arrival: process arrives after all others finish
// ─────────────────────────────────────────────
describe('Late arrival — metrics unaffected by idle gap', () => {
  const result = runSimulation(
    [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0,  burstTime: 3 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 10, burstTime: 2 }),
    ],
    fcfsScheduler,
    cfg
  );

  it('P1 WT = 0', () => {
    expect(result.processes.find(p => p.pid === 1)!.waitingTime).toBe(0);
  });

  it('P2 WT = 0 (arrived after P1 finished, no waiting)', () => {
    expect(result.processes.find(p => p.pid === 2)!.waitingTime).toBe(0);
  });

  it('total time = 12', () => {
    expect(result.metrics.totalTime).toBe(12);
  });
});

// ─────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────

describe('round helper', () => {
  it('rounds to 2 decimal places by default', () => {
    expect(round(1.2345)).toBe(1.23);
    expect(round(1.235)).toBe(1.24);
  });

  it('rounds to specified decimal places', () => {
    expect(round(16.0, 0)).toBe(16);
    expect(round(1.2345, 3)).toBe(1.235);
  });
});

describe('formatMetrics helper', () => {
  it('returns a multi-line string with all metric fields', () => {
    const result = runSimulation(
      [createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 })],
      fcfsScheduler,
      cfg
    );
    const str = formatMetrics(result.metrics);
    expect(str).toContain('Avg WT');
    expect(str).toContain('Avg TAT');
    expect(str).toContain('CPU util');
    expect(str).toContain('Throughput');
  });
});

describe('formatProcessMetrics helper', () => {
  it('returns a string with PID, name, and key fields', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 });
    p.startTime = 0; p.completionTime = 5;
    computeProcessMetrics(p);
    const str = formatProcessMetrics(p);
    expect(str).toContain('PID=1');
    expect(str).toContain('P1');
    expect(str).toContain('TAT=5');
    expect(str).toContain('WT=0');
  });
});
