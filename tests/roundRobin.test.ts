// ============================================================
// tests/roundRobin.test.ts — Phase 5: Round Robin Tests
// Covers:
//   - TC-5 (Quantum = 4) textbook example
//   - Quantum = 1
//   - Quantum = 2
//   - Large quantum behaves like FCFS
//   - Arrival at the exact tick quantum expires (queue ordering)
//   - Continuous run when readyQueue is empty on quantum expiration
//   - Registry lookup
// ============================================================

import { describe, it, expect } from 'vitest';
import { createPCB } from '../src/engine/pcb';
import { runSimulation, defaultConfig } from '../src/engine/simulator';
import { createRoundRobinScheduler, roundRobinScheduler } from '../src/engine/algorithms/roundRobin';
import { fcfsScheduler } from '../src/engine/algorithms/fcfs';
import { getScheduler } from '../src/engine/algorithms/index';
import { ProcessState } from '../src/engine/types';

// ─────────────────────────────────────────────
// Textbook Example 1: TC-5 from docs/test-cases.md (Quantum = 4)
//
// PID | Arrival | Burst
//  P1 |    0    |  10
//  P2 |    0    |   6
//  P3 |    0    |   2
//
// Expected Gantt: P1[0-4] P2[4-8] P3[8-10] P1[10-14] P2[14-16] P1[16-18]
// Expected metrics:
//   P1: TAT=18, WT=8,  RT=0
//   P2: TAT=16, WT=10, RT=4
//   P3: TAT=10, WT=8,  RT=8
// ─────────────────────────────────────────────
describe('Round Robin — TC-5: Quantum = 4 textbook example', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 10 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 6  }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 0, burstTime: 2  }),
  ];

  const cfg = defaultConfig({
    algorithm: 'Round Robin',
    timeQuantum: 4,
    contextSwitchCost: 0,
  });

  const result = runSimulation(processes, createRoundRobinScheduler(4), cfg);

  it('matches textbook Gantt chart with 6 segments', () => {
    expect(result.gantt).toHaveLength(6);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0,  end: 4  });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 4,  end: 8  });
    expect(result.gantt[2]).toMatchObject({ pid: 3, start: 8,  end: 10 });
    expect(result.gantt[3]).toMatchObject({ pid: 1, start: 10, end: 14 });
    expect(result.gantt[4]).toMatchObject({ pid: 2, start: 14, end: 16 });
    expect(result.gantt[5]).toMatchObject({ pid: 1, start: 16, end: 18 });
  });

  it('verifies P1 metrics: completion=18, TAT=18, WT=8, RT=0', () => {
    const p1 = result.processes.find(p => p.pid === 1)!;
    expect(p1.completionTime).toBe(18);
    expect(p1.turnaroundTime).toBe(18);
    expect(p1.waitingTime).toBe(8);
    expect(p1.responseTime).toBe(0);
  });

  it('verifies P2 metrics: completion=16, TAT=16, WT=10, RT=4', () => {
    const p2 = result.processes.find(p => p.pid === 2)!;
    expect(p2.completionTime).toBe(16);
    expect(p2.turnaroundTime).toBe(16);
    expect(p2.waitingTime).toBe(10);
    expect(p2.responseTime).toBe(4);
  });

  it('verifies P3 metrics: completion=10, TAT=10, WT=8, RT=8', () => {
    const p3 = result.processes.find(p => p.pid === 3)!;
    expect(p3.completionTime).toBe(10);
    expect(p3.turnaroundTime).toBe(10);
    expect(p3.waitingTime).toBe(8);
    expect(p3.responseTime).toBe(8);
  });

  it('verifies aggregate averages', () => {
    expect(result.metrics.avgWaitingTime).toBeCloseTo(26 / 3, 4);
    expect(result.metrics.avgTurnaroundTime).toBeCloseTo(44 / 3, 4);
    expect(result.metrics.avgResponseTime).toBeCloseTo(12 / 3, 4);
  });
});

// ─────────────────────────────────────────────
// Test Scenario: Quantum = 1
//
// PID | Arrival | Burst
//  P1 |    0    |   3
//  P2 |    0    |   2
//  P3 |    0    |   1
//
// Expected Gantt: P1[0-1] P2[1-2] P3[2-3] P1[3-4] P2[4-5] P1[5-6]
// ─────────────────────────────────────────────
describe('Round Robin — Quantum = 1', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 2 }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 0, burstTime: 1 }),
  ];

  const cfg = defaultConfig({ timeQuantum: 1 });
  const result = runSimulation(processes, createRoundRobinScheduler(1), cfg);

  it('switches every single tick', () => {
    expect(result.gantt).toHaveLength(6);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 1 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 1, end: 2 });
    expect(result.gantt[2]).toMatchObject({ pid: 3, start: 2, end: 3 });
    expect(result.gantt[3]).toMatchObject({ pid: 1, start: 3, end: 4 });
    expect(result.gantt[4]).toMatchObject({ pid: 2, start: 4, end: 5 });
    expect(result.gantt[5]).toMatchObject({ pid: 1, start: 5, end: 6 });
  });

  it('computes correct metrics for q = 1', () => {
    const p1 = result.processes.find(p => p.pid === 1)!;
    const p2 = result.processes.find(p => p.pid === 2)!;
    const p3 = result.processes.find(p => p.pid === 3)!;

    expect(p1.turnaroundTime).toBe(6);
    expect(p1.waitingTime).toBe(3);
    expect(p2.turnaroundTime).toBe(5);
    expect(p2.waitingTime).toBe(3);
    expect(p3.turnaroundTime).toBe(3);
    expect(p3.waitingTime).toBe(2);
  });
});

// ─────────────────────────────────────────────
// Test Scenario: Quantum = 2
//
// PID | Arrival | Burst
//  P1 |    0    |   5
//  P2 |    0    |   4
//  P3 |    0    |   2
//
// Expected Gantt: P1[0-2] P2[2-4] P3[4-6] P1[6-8] P2[8-10] P1[10-11]
// ─────────────────────────────────────────────
describe('Round Robin — Quantum = 2', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 4 }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 0, burstTime: 2 }),
  ];

  const cfg = defaultConfig({ timeQuantum: 2 });
  const result = runSimulation(processes, createRoundRobinScheduler(2), cfg);

  it('interleaves processes with slice size 2', () => {
    expect(result.gantt).toHaveLength(6);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0,  end: 2  });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 2,  end: 4  });
    expect(result.gantt[2]).toMatchObject({ pid: 3, start: 4,  end: 6  });
    expect(result.gantt[3]).toMatchObject({ pid: 1, start: 6,  end: 8  });
    expect(result.gantt[4]).toMatchObject({ pid: 2, start: 8,  end: 10 });
    expect(result.gantt[5]).toMatchObject({ pid: 1, start: 10, end: 11 });
  });
});

// ─────────────────────────────────────────────
// Test Scenario: Large Quantum (q >= total bursts) behaves like FCFS
// ─────────────────────────────────────────────
describe('Round Robin — Large quantum matches FCFS exactly', () => {
  const makeProcesses = () => [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 24 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 1, burstTime: 3  }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 2, burstTime: 3  }),
  ];

  const cfgRR   = defaultConfig({ timeQuantum: 100 });
  const cfgFCFS = defaultConfig({ algorithm: 'FCFS' });

  const resultRR   = runSimulation(makeProcesses(), createRoundRobinScheduler(100), cfgRR);
  const resultFCFS = runSimulation(makeProcesses(), fcfsScheduler, cfgFCFS);

  it('produces identical Gantt charts', () => {
    expect(resultRR.gantt).toEqual(resultFCFS.gantt);
  });

  it('produces identical average waiting and turnaround times', () => {
    expect(resultRR.metrics.avgWaitingTime).toBe(resultFCFS.metrics.avgWaitingTime);
    expect(resultRR.metrics.avgTurnaroundTime).toBe(resultFCFS.metrics.avgTurnaroundTime);
  });
});

// ─────────────────────────────────────────────
// Edge Case: Arrival at the exact tick quantum expires
//
// At t=2:
//   P1 (burst 4) completes its 2-tick quantum (ran t=0, 1).
//   P2 (burst 2) arrives at t=2.
//
// Rule: Arriving process is enqueued BEFORE the preempted process.
// ReadyQueue order: [P2, P1]
// Gantt must be: P1[0-2] P2[2-4] P1[4-6]
// ─────────────────────────────────────────────
describe('Round Robin — Edge Case: Arrival at exact quantum expiry', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 4 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 2, burstTime: 2 }),
  ];

  const cfg = defaultConfig({ timeQuantum: 2 });
  const result = runSimulation(processes, createRoundRobinScheduler(2), cfg);

  it('enqueues arriving process before preempted process', () => {
    expect(result.gantt).toHaveLength(3);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 2 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 2, end: 4 });
    expect(result.gantt[2]).toMatchObject({ pid: 1, start: 4, end: 6 });
  });
});

// ─────────────────────────────────────────────
// Edge Case: Quantum expires when readyQueue is empty
//
// Running process should continue seamlessly without artificial preemption.
// ─────────────────────────────────────────────
describe('Round Robin — Edge Case: Empty ready queue on quantum expiry', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 6 }),
  ];

  const cfg = defaultConfig({ timeQuantum: 2 });
  const result = runSimulation(processes, createRoundRobinScheduler(2), cfg);

  it('runs continuously without slicing into multiple Gantt blocks', () => {
    expect(result.gantt).toHaveLength(1);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 6 });
  });
});

// ─────────────────────────────────────────────
// Registry check
// ─────────────────────────────────────────────
describe('Round Robin — Registry lookup', () => {
  it('is accessible via getScheduler("Round Robin") and getScheduler("RR")', () => {
    expect(getScheduler('Round Robin').name).toBe('Round Robin');
    expect(getScheduler('RR').preemptive).toBe(true);
    expect(getScheduler('ROUNDROBIN').name).toBe('Round Robin');
  });
});
