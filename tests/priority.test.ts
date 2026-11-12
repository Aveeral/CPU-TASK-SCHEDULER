// ============================================================
// tests/priority.test.ts — Phase 4: Priority Scheduling Tests
// Covers both Non-Preemptive and Preemptive modes,
// configurable priority direction, tie-breaking, and aging.
// ============================================================

import { describe, it, expect } from 'vitest';
import { createPCB } from '../src/engine/pcb';
import { runSimulation, defaultConfig } from '../src/engine/simulator';
import {
  priorityNonPreemptiveScheduler,
  priorityPreemptiveScheduler,
  createPriorityScheduler,
} from '../src/engine/algorithms/priority';
import { getScheduler } from '../src/engine/algorithms/index';
import { ProcessState } from '../src/engine/types';

// ─────────────────────────────────────────────
// Textbook Example 1: TC-6 from docs/test-cases.md
// Priority Non-Preemptive (lower number = higher priority)
//
// PID | Arrival | Burst | Priority
//  P1 |    0    |  10   |    3
//  P2 |    0    |   1   |    1
//  P3 |    0    |   2   |    4
//  P4 |    0    |   1   |    5
//  P5 |    0    |   5   |    2
//
// Expected Gantt: P2[0-1] P5[1-6] P1[6-16] P3[16-18] P4[18-19]
// Expected WT: P1=6, P2=0, P3=16, P4=18, P5=1 -> Avg WT = 8.2
// Expected TAT: P1=16, P2=1, P3=18, P4=19, P5=6 -> Avg TAT = 12.0
// ─────────────────────────────────────────────
describe('Priority Non-Preemptive — TC-6: Textbook 5-process', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 10, priority: 3 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 1,  priority: 1 }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 0, burstTime: 2,  priority: 4 }),
    createPCB({ pid: 4, name: 'P4', arrivalTime: 0, burstTime: 1,  priority: 5 }),
    createPCB({ pid: 5, name: 'P5', arrivalTime: 0, burstTime: 5,  priority: 2 }),
  ];

  const cfg = defaultConfig({
    algorithm: 'Priority',
    higherPriorityFirst: true, // lower number = higher priority
    contextSwitchCost: 0,
  });

  const result = runSimulation(processes, priorityNonPreemptiveScheduler, cfg);

  it('schedules in priority order: P2(1) -> P5(2) -> P1(3) -> P3(4) -> P4(5)', () => {
    expect(result.gantt).toHaveLength(5);
    expect(result.gantt[0]).toMatchObject({ pid: 2, start: 0, end: 1 });
    expect(result.gantt[1]).toMatchObject({ pid: 5, start: 1, end: 6 });
    expect(result.gantt[2]).toMatchObject({ pid: 1, start: 6, end: 16 });
    expect(result.gantt[3]).toMatchObject({ pid: 3, start: 16, end: 18 });
    expect(result.gantt[4]).toMatchObject({ pid: 4, start: 18, end: 19 });
  });

  it('verifies per-process WT matching textbook', () => {
    expect(result.processes.find(p => p.pid === 1)!.waitingTime).toBe(6);
    expect(result.processes.find(p => p.pid === 2)!.waitingTime).toBe(0);
    expect(result.processes.find(p => p.pid === 3)!.waitingTime).toBe(16);
    expect(result.processes.find(p => p.pid === 4)!.waitingTime).toBe(18);
    expect(result.processes.find(p => p.pid === 5)!.waitingTime).toBe(1);
  });

  it('verifies aggregate averages: Avg WT = 8.2, Avg TAT = 12.0', () => {
    expect(result.metrics.avgWaitingTime).toBeCloseTo(8.2, 5);
    expect(result.metrics.avgTurnaroundTime).toBeCloseTo(12.0, 5);
  });
});

// ─────────────────────────────────────────────
// Textbook Example 2: Priority Preemptive
//
// PID | Arrival | Burst | Priority (lower = higher)
//  P1 |    0    |   4   |    3
//  P2 |    1    |   2   |    1
//  P3 |    2    |   3   |    2
//
// Timeline:
//  t=0: P1 starts (pri 3)
//  t=1: P2 arrives (pri 1). P2 preempts P1!
//  t=2: P3 arrives (pri 2). P2 is pri 1 -> P2 continues.
//  t=3: P2 finishes! Ready: P3 (pri 2), P1 (pri 3). P3 runs.
//  t=6: P3 finishes! P1 runs.
//  t=9: P1 finishes!
//
// Gantt: P1[0-1] P2[1-3] P3[3-6] P1[6-9]
// WT: P1 = 5, P2 = 0, P3 = 1 -> Avg WT = 2.0
// TAT: P1 = 9, P2 = 2, P3 = 4 -> Avg TAT = 5.0
// ─────────────────────────────────────────────
describe('Priority Preemptive — Textbook Example 2', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 4, priority: 3 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 1, burstTime: 2, priority: 1 }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 2, burstTime: 3, priority: 2 }),
  ];

  const cfg = defaultConfig({
    algorithm: 'Priority (Preemptive)',
    higherPriorityFirst: true,
    contextSwitchCost: 0,
  });

  const result = runSimulation(processes, priorityPreemptiveScheduler, cfg);

  it('matches preemptive Gantt: P1[0-1] P2[1-3] P3[3-6] P1[6-9]', () => {
    expect(result.gantt).toHaveLength(4);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 1 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 1, end: 3 });
    expect(result.gantt[2]).toMatchObject({ pid: 3, start: 3, end: 6 });
    expect(result.gantt[3]).toMatchObject({ pid: 1, start: 6, end: 9 });
  });

  it('computes exact waiting and turnaround times', () => {
    const p1 = result.processes.find(p => p.pid === 1)!;
    const p2 = result.processes.find(p => p.pid === 2)!;
    const p3 = result.processes.find(p => p.pid === 3)!;

    expect(p1.waitingTime).toBe(5);
    expect(p2.waitingTime).toBe(0);
    expect(p3.waitingTime).toBe(1);

    expect(result.metrics.avgWaitingTime).toBeCloseTo(2.0, 5);
    expect(result.metrics.avgTurnaroundTime).toBeCloseTo(5.0, 5);
  });
});

// ─────────────────────────────────────────────
// Configurable Priority Direction: higher number = higher priority
// ─────────────────────────────────────────────
describe('Priority — higher number = higher priority flag', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3, priority: 10 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 3, priority: 50 }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 0, burstTime: 3, priority: 20 }),
  ];

  const cfg = defaultConfig({
    algorithm: 'Priority',
    higherPriorityFirst: false, // higher number = higher priority
  });

  const result = runSimulation(processes, priorityNonPreemptiveScheduler, cfg);

  it('schedules highest number first: P2(50) -> P3(20) -> P1(10)', () => {
    expect(result.gantt[0].pid).toBe(2);
    expect(result.gantt[1].pid).toBe(3);
    expect(result.gantt[2].pid).toBe(1);
  });
});

// ─────────────────────────────────────────────
// Tie-breaking: Equal priorities broken by arrival time, then PID
// ─────────────────────────────────────────────
describe('Priority — Tie-breaking rules', () => {
  it('breaks equal priority ties by arrival time', () => {
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 4, priority: 1 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 2, burstTime: 2, priority: 1 }),
      createPCB({ pid: 3, name: 'P3', arrivalTime: 1, burstTime: 2, priority: 1 }),
    ];

    const cfg = defaultConfig({ higherPriorityFirst: true });
    const result = runSimulation(processes, priorityNonPreemptiveScheduler, cfg);

    // P1 runs 0-4. At t=4, P2(arr 2) and P3(arr 1) are ready with equal priority 1.
    // P3 arrived earlier (t=1 vs t=2) -> P3 runs next!
    expect(result.gantt[0].pid).toBe(1);
    expect(result.gantt[1].pid).toBe(3);
    expect(result.gantt[2].pid).toBe(2);
  });

  it('breaks equal priority and arrival ties by PID', () => {
    const processes = [
      createPCB({ pid: 9, name: 'P9', arrivalTime: 0, burstTime: 2, priority: 2 }),
      createPCB({ pid: 3, name: 'P3', arrivalTime: 0, burstTime: 2, priority: 2 }),
    ];

    const cfg = defaultConfig({ higherPriorityFirst: true });
    const result = runSimulation(processes, priorityNonPreemptiveScheduler, cfg);
    expect(result.gantt[0].pid).toBe(3);
    expect(result.gantt[1].pid).toBe(9);
  });
});

// ─────────────────────────────────────────────
// Priority Aging mechanism
// ─────────────────────────────────────────────
describe('Priority — Aging prevents starvation', () => {
  it('boosts priority of waiting processes every agingInterval ticks', () => {
    // P1 has high priority (0) and runs for 20 ticks.
    // P2 has low priority (5), arrives at t=0.
    // With agingInterval = 5, P2 should age up at t=5, 10, 15, 20.
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 20, priority: 0 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 2,  priority: 5 }),
    ];

    const cfg = defaultConfig({
      higherPriorityFirst: true,
      agingEnabled: true,
      agingInterval: 5,
    });

    const result = runSimulation(processes, priorityNonPreemptiveScheduler, cfg);

    // After P1 finishes at t=20, P2 was aged 4 times (at t=5, 10, 15, 20)
    // Its priority should have dropped from 5 towards 1
    const p2 = result.processes.find(p => p.pid === 2)!;
    expect(p2.priority).toBeLessThan(5);
  });
});

// ─────────────────────────────────────────────
// Registry check
// ─────────────────────────────────────────────
describe('Priority — Registry lookup', () => {
  it('is accessible via getScheduler with multiple variants', () => {
    expect(getScheduler('Priority').name).toBe('Priority (Non-Preemptive)');
    expect(getScheduler('Priority (Preemptive)').name).toBe('Priority (Preemptive)');
    expect(getScheduler('PRIORITY_PREEMPTIVE').preemptive).toBe(true);
    expect(getScheduler('PRIORITY_NP').preemptive).toBe(false);
  });
});
