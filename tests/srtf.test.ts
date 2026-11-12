// ============================================================
// tests/srtf.test.ts — Phase 4: SRTF (Preemptive SJF) Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { createPCB } from '../src/engine/pcb';
import { runSimulation, defaultConfig } from '../src/engine/simulator';
import { srtfScheduler } from '../src/engine/algorithms/srtf';
import { getScheduler } from '../src/engine/algorithms/index';
import { ProcessState } from '../src/engine/types';

const cfg = defaultConfig({ algorithm: 'SRTF', contextSwitchCost: 0 });

// ─────────────────────────────────────────────
// Textbook Example 1: TC-4 from docs/test-cases.md
//
// PID | Arrival | Burst
//  P1 |    0    |   7
//  P2 |    2    |   4
//  P3 |    4    |   1
//  P4 |    5    |   4
//
// Expected Gantt: P1[0-2] P2[2-4] P3[4-5] P2[5-7] P4[7-11] P1[11-16]
// Expected metrics:
//   P1: TAT=16, WT=9, RT=0
//   P2: TAT=5,  WT=1, RT=0
//   P3: TAT=1,  WT=0, RT=0
//   P4: TAT=6,  WT=2, RT=2
//   Avg WT = 3.0, Avg TAT = 7.0
// ─────────────────────────────────────────────
describe('SRTF — TC-4: Preemptive SJF 4-process', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 7 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 2, burstTime: 4 }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 4, burstTime: 1 }),
    createPCB({ pid: 4, name: 'P4', arrivalTime: 5, burstTime: 4 }),
  ];

  const result = runSimulation(processes, srtfScheduler, cfg);

  it('produces exact 6 Gantt segments showing two preemptions and returns', () => {
    expect(result.gantt).toHaveLength(6);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 2 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 2, end: 4 });
    expect(result.gantt[2]).toMatchObject({ pid: 3, start: 4, end: 5 });
    expect(result.gantt[3]).toMatchObject({ pid: 2, start: 5, end: 7 });
    expect(result.gantt[4]).toMatchObject({ pid: 4, start: 7, end: 11 });
    expect(result.gantt[5]).toMatchObject({ pid: 1, start: 11, end: 16 });
  });

  it('verifies P1 metrics: TAT=16, WT=9, RT=0', () => {
    const p1 = result.processes.find(p => p.pid === 1)!;
    expect(p1.completionTime).toBe(16);
    expect(p1.turnaroundTime).toBe(16);
    expect(p1.waitingTime).toBe(9);
    expect(p1.responseTime).toBe(0);
  });

  it('verifies P2 metrics: TAT=5, WT=1, RT=0', () => {
    const p2 = result.processes.find(p => p.pid === 2)!;
    expect(p2.completionTime).toBe(7);
    expect(p2.turnaroundTime).toBe(5);
    expect(p2.waitingTime).toBe(1);
    expect(p2.responseTime).toBe(0);
  });

  it('verifies P3 metrics: TAT=1, WT=0, RT=0', () => {
    const p3 = result.processes.find(p => p.pid === 3)!;
    expect(p3.completionTime).toBe(5);
    expect(p3.turnaroundTime).toBe(1);
    expect(p3.waitingTime).toBe(0);
    expect(p3.responseTime).toBe(0);
  });

  it('verifies P4 metrics: TAT=6, WT=2, RT=2', () => {
    const p4 = result.processes.find(p => p.pid === 4)!;
    expect(p4.completionTime).toBe(11);
    expect(p4.turnaroundTime).toBe(6);
    expect(p4.waitingTime).toBe(2);
    expect(p4.responseTime).toBe(2);
  });

  it('verifies aggregate averages: Avg WT = 3.0, Avg TAT = 7.0', () => {
    expect(result.metrics.avgWaitingTime).toBeCloseTo(3.0, 5);
    expect(result.metrics.avgTurnaroundTime).toBeCloseTo(7.0, 5);
  });
});

// ─────────────────────────────────────────────
// Textbook Example 2: Classic Silberschatz SRTF Example
//
// PID | Arrival | Burst
//  P1 |    0    |   8
//  P2 |    1    |   4
//  P3 |    2    |   9
//  P4 |    3    |   5
//
// Expected Gantt: P1[0-1] P2[1-5] P4[5-10] P1[10-17] P3[17-26]
// Expected metrics:
//   P1: completion=17, TAT=17, WT=9,  RT=0
//   P2: completion=5,  TAT=4,  WT=0,  RT=0
//   P3: completion=26, TAT=24, WT=15, RT=15
//   P4: completion=10, TAT=7,  WT=2,  RT=2
//   Avg WT = 6.5, Avg TAT = 13.0
// ─────────────────────────────────────────────
describe('SRTF — Textbook Example 2: Silberschatz 4-process', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 8 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 1, burstTime: 4 }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 2, burstTime: 9 }),
    createPCB({ pid: 4, name: 'P4', arrivalTime: 3, burstTime: 5 }),
  ];

  const result = runSimulation(processes, srtfScheduler, cfg);

  it('matches Silberschatz Gantt chart exactly', () => {
    expect(result.gantt).toHaveLength(5);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 1 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 1, end: 5 });
    expect(result.gantt[2]).toMatchObject({ pid: 4, start: 5, end: 10 });
    expect(result.gantt[3]).toMatchObject({ pid: 1, start: 10, end: 17 });
    expect(result.gantt[4]).toMatchObject({ pid: 3, start: 17, end: 26 });
  });

  it('matches per-process metrics', () => {
    const p1 = result.processes.find(p => p.pid === 1)!;
    const p2 = result.processes.find(p => p.pid === 2)!;
    const p3 = result.processes.find(p => p.pid === 3)!;
    const p4 = result.processes.find(p => p.pid === 4)!;

    expect(p1.waitingTime).toBe(9);
    expect(p2.waitingTime).toBe(0);
    expect(p3.waitingTime).toBe(15);
    expect(p4.waitingTime).toBe(2);
  });

  it('matches aggregate averages: Avg WT = 6.5, Avg TAT = 13.0', () => {
    expect(result.metrics.avgWaitingTime).toBeCloseTo(6.5, 5);
    expect(result.metrics.avgTurnaroundTime).toBeCloseTo(13.0, 5);
  });
});

// ─────────────────────────────────────────────
// Preemption boundary: Equal remaining time should NOT preempt
// ─────────────────────────────────────────────
describe('SRTF — Equal remaining time preemption rule', () => {
  it('does NOT preempt running process when an arrival has equal remaining time', () => {
    // P1 arrives at 0 with burst 5. At t=2, P1 has remainingTime = 3.
    // P2 arrives at t=2 with burst 3 (remainingTime = 3).
    // P1 should continue without being preempted!
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 2, burstTime: 3 }),
    ];

    const result = runSimulation(processes, srtfScheduler, cfg);
    // Gantt should be P1[0-5] and P2[5-8] (P1 was not interrupted at t=2)
    expect(result.gantt).toHaveLength(2);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 5 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 5, end: 8 });
  });
});

// ─────────────────────────────────────────────
// Registry check
// ─────────────────────────────────────────────
describe('SRTF — Registry lookup', () => {
  it('is accessible via getScheduler("SRTF")', () => {
    const s = getScheduler('SRTF');
    expect(s.name).toBe('SRTF');
    expect(s.preemptive).toBe(true);
  });
});
