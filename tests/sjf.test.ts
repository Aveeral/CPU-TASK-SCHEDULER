// ============================================================
// tests/sjf.test.ts — Phase 4: SJF (Non-Preemptive) Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { createPCB } from '../src/engine/pcb';
import { runSimulation, defaultConfig } from '../src/engine/simulator';
import { sjfScheduler } from '../src/engine/algorithms/sjf';
import { getScheduler } from '../src/engine/algorithms/index';
import { ProcessState } from '../src/engine/types';

const cfg = defaultConfig({ algorithm: 'SJF', contextSwitchCost: 0 });

// ─────────────────────────────────────────────
// Textbook Example 1: TC-3 from docs/test-cases.md
//
// PID | Arrival | Burst
//  P1 |    0    |   7
//  P2 |    2    |   4
//  P3 |    4    |   1
//  P4 |    5    |   4
//
// Expected Gantt: P1[0-7] P3[7-8] P2[8-12] P4[12-16]
// Expected metrics:
//   P1: TAT=7,  WT=0, RT=0
//   P2: TAT=10, WT=6, RT=6
//   P3: TAT=4,  WT=3, RT=3
//   P4: TAT=11, WT=7, RT=7
//   Avg WT = 4, Avg TAT = 8
// ─────────────────────────────────────────────
describe('SJF — TC-3: Textbook 4-process non-preemptive', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 7 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 2, burstTime: 4 }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 4, burstTime: 1 }),
    createPCB({ pid: 4, name: 'P4', arrivalTime: 5, burstTime: 4 }),
  ];

  const result = runSimulation(processes, sjfScheduler, cfg);

  it('produces 4 Gantt entries in non-preemptive order', () => {
    expect(result.gantt).toHaveLength(4);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 7 });
    expect(result.gantt[1]).toMatchObject({ pid: 3, start: 7, end: 8 });
    expect(result.gantt[2]).toMatchObject({ pid: 2, start: 8, end: 12 });
    expect(result.gantt[3]).toMatchObject({ pid: 4, start: 12, end: 16 });
  });

  it('verifies P1 metrics: TAT=7, WT=0, RT=0', () => {
    const p1 = result.processes.find(p => p.pid === 1)!;
    expect(p1.completionTime).toBe(7);
    expect(p1.turnaroundTime).toBe(7);
    expect(p1.waitingTime).toBe(0);
    expect(p1.responseTime).toBe(0);
  });

  it('verifies P2 metrics: TAT=10, WT=6, RT=6', () => {
    const p2 = result.processes.find(p => p.pid === 2)!;
    expect(p2.completionTime).toBe(12);
    expect(p2.turnaroundTime).toBe(10);
    expect(p2.waitingTime).toBe(6);
    expect(p2.responseTime).toBe(6);
  });

  it('verifies P3 metrics: TAT=4, WT=3, RT=3', () => {
    const p3 = result.processes.find(p => p.pid === 3)!;
    expect(p3.completionTime).toBe(8);
    expect(p3.turnaroundTime).toBe(4);
    expect(p3.waitingTime).toBe(3);
    expect(p3.responseTime).toBe(3);
  });

  it('verifies P4 metrics: TAT=11, WT=7, RT=7', () => {
    const p4 = result.processes.find(p => p.pid === 4)!;
    expect(p4.completionTime).toBe(16);
    expect(p4.turnaroundTime).toBe(11);
    expect(p4.waitingTime).toBe(7);
    expect(p4.responseTime).toBe(7);
  });

  it('verifies averages: Avg WT = 4, Avg TAT = 8', () => {
    expect(result.metrics.avgWaitingTime).toBeCloseTo(4, 5);
    expect(result.metrics.avgTurnaroundTime).toBeCloseTo(8, 5);
    expect(result.metrics.avgResponseTime).toBeCloseTo(4, 5);
  });

  it('all processes terminated with 100% CPU utilization', () => {
    expect(result.processes.every(p => p.state === ProcessState.TERMINATED)).toBe(true);
    expect(result.metrics.cpuUtilization).toBeCloseTo(100, 1);
  });
});

// ─────────────────────────────────────────────
// Textbook Example 2: All arriving at t=0
//
// PID | Arrival | Burst
//  P1 |    0    |   6
//  P2 |    0    |   8
//  P3 |    0    |   7
//  P4 |    0    |   3
//
// Expected Order: P4 (3) -> P1 (6) -> P3 (7) -> P2 (8)
// Gantt: P4[0-3] P1[3-9] P3[9-16] P2[16-24]
// WT: P4=0, P1=3, P3=9, P2=16 -> Avg WT = 28 / 4 = 7.0
// TAT: P4=3, P1=9, P3=16, P2=24 -> Avg TAT = 52 / 4 = 13.0
// ─────────────────────────────────────────────
describe('SJF — Textbook Example 2: Simultaneous arrivals at t=0', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 6 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 8 }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 0, burstTime: 7 }),
    createPCB({ pid: 4, name: 'P4', arrivalTime: 0, burstTime: 3 }),
  ];

  const result = runSimulation(processes, sjfScheduler, cfg);

  it('schedules shortest burst first', () => {
    expect(result.gantt).toHaveLength(4);
    expect(result.gantt[0].pid).toBe(4);
    expect(result.gantt[1].pid).toBe(1);
    expect(result.gantt[2].pid).toBe(3);
    expect(result.gantt[3].pid).toBe(2);
  });

  it('matches expected Gantt timeline', () => {
    expect(result.gantt[0]).toMatchObject({ pid: 4, start: 0, end: 3 });
    expect(result.gantt[1]).toMatchObject({ pid: 1, start: 3, end: 9 });
    expect(result.gantt[2]).toMatchObject({ pid: 3, start: 9, end: 16 });
    expect(result.gantt[3]).toMatchObject({ pid: 2, start: 16, end: 24 });
  });

  it('matches expected averages: Avg WT = 7.0, Avg TAT = 13.0', () => {
    expect(result.metrics.avgWaitingTime).toBeCloseTo(7.0, 5);
    expect(result.metrics.avgTurnaroundTime).toBeCloseTo(13.0, 5);
  });
});

// ─────────────────────────────────────────────
// Tie-breaking: Equal burst times broken by arrival time, then PID
// ─────────────────────────────────────────────
describe('SJF — Tie-breaking rules', () => {
  it('breaks equal burst time ties by arrival time', () => {
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 4 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 1, burstTime: 3 }), // finishes at 4+3=7
      createPCB({ pid: 3, name: 'P3', arrivalTime: 2, burstTime: 3 }), // arrived at 2
      createPCB({ pid: 4, name: 'P4', arrivalTime: 3, burstTime: 3 }), // arrived at 3
    ];

    const result = runSimulation(processes, sjfScheduler, cfg);
    // P1 runs 0-4. At t=4, P2(arr 1), P3(arr 2), P4(arr 3) are ready, all burst 3.
    // Must run P2, then P3, then P4
    expect(result.gantt[0].pid).toBe(1);
    expect(result.gantt[1].pid).toBe(2);
    expect(result.gantt[2].pid).toBe(3);
    expect(result.gantt[3].pid).toBe(4);
  });

  it('breaks equal burst and arrival ties by PID', () => {
    const processes = [
      createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 5 }),
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 }),
    ];

    const result = runSimulation(processes, sjfScheduler, cfg);
    expect(result.gantt[0].pid).toBe(1);
    expect(result.gantt[1].pid).toBe(2);
  });
});

// ─────────────────────────────────────────────
// Registry check
// ─────────────────────────────────────────────
describe('SJF — Registry lookup', () => {
  it('is accessible via getScheduler("SJF")', () => {
    const s = getScheduler('SJF');
    expect(s.name).toBe('SJF');
    expect(s.preemptive).toBe(false);
  });
});
