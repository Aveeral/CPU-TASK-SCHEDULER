// ============================================================
// tests/mlfq.test.ts — Phase 6: Advanced Features
// Tests cover:
//   1. MLFQ Demotion across 3 levels (Level 0 q=4 -> Level 1 q=8 -> Level 2 FCFS)
//   2. MLFQ Preemption when a new process arrives in Level 0
//   3. MLFQ Priority Boost preventing starvation
//   4. Context-Switch Overhead (idle ticks on dispatch)
//   5. I/O Bursts and WAITING process state verification
//   6. Registry lookup
// ============================================================

import { describe, it, expect } from 'vitest';
import { createPCB } from '../src/engine/pcb';
import { runSimulation, defaultConfig } from '../src/engine/simulator';
import { createMLFQScheduler, mlfqScheduler } from '../src/engine/algorithms/mlfq';
import { getScheduler } from '../src/engine/algorithms/index';
import { ProcessState } from '../src/engine/types';

// ─────────────────────────────────────────────
// 1. MLFQ Demotion Scenario
//
// P1: Arrival 0, Burst 14
// P2: Arrival 0, Burst 4
//
// Level 0 (q=4):
//   t=0: Both in Level 0. P1 runs 4 ticks (t=0-4).
//   t=4: P1 exhausts q=4 -> demoted to Level 1 (q=8).
//        P2 in Level 0 runs 4 ticks (t=4-8) and completes at t=8!
// Level 1 (q=8):
//   t=8: P1 runs in Level 1 for 8 ticks (t=8-16, remaining 2).
//   t=16: P1 exhausts q=8 -> demoted to Level 2 (FCFS).
// Level 2 (FCFS):
//   t=16: P1 runs remaining 2 ticks (t=16-18) and completes at t=18!
//
// Expected Gantt: P1[0-4] P2[4-8] P1[8-18]
// ─────────────────────────────────────────────
describe('MLFQ — Demotion across 3 queues', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 14 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 4  }),
  ];

  const cfg = defaultConfig({ algorithm: 'MLFQ' });
  const result = runSimulation(processes, createMLFQScheduler({ boostInterval: 100 }), cfg);

  it('runs P1 for 4 ticks, demotes it, then P2 finishes in Level 0', () => {
    expect(result.gantt).toHaveLength(3);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 4 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 4, end: 8 });
    expect(result.gantt[2]).toMatchObject({ pid: 1, start: 8, end: 18 });
  });

  it('verifies both processes complete and metrics are computed', () => {
    const p1 = result.processes.find(p => p.pid === 1)!;
    const p2 = result.processes.find(p => p.pid === 2)!;

    expect(p2.completionTime).toBe(8);
    expect(p1.completionTime).toBe(18);
    expect(result.processes.every(p => p.state === ProcessState.TERMINATED)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// 2. MLFQ Preemption by Higher-Priority Arrival
//
// P1 arrives at t=0, burst 10. Runs in Level 0 (t=0-4), demoted to Level 1.
// P1 starts in Level 1 at t=4.
// P2 arrives at t=6 with burst 2 (enters Level 0).
// P2 must preempt P1 at t=6 because Level 0 > Level 1!
// P2 runs t=6-8 and finishes. P1 resumes at t=8.
//
// Expected Gantt: P1[0-4] P1[4-6] (merged to P1[0-6]) P2[6-8] P1[8-12]
// ─────────────────────────────────────────────
describe('MLFQ — Preemption on new arrival in higher queue', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 10 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 6, burstTime: 2  }),
  ];

  const cfg = defaultConfig({ algorithm: 'MLFQ' });
  const result = runSimulation(processes, createMLFQScheduler({ boostInterval: 100 }), cfg);

  it('preempts Level 1 process when Level 0 arrival occurs', () => {
    // P1 runs 0-6, P2 preempts and runs 6-8, P1 resumes 8-12
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 6 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 6, end: 8 });
    expect(result.gantt[2]).toMatchObject({ pid: 1, start: 8, end: 12 });
  });
});

// ─────────────────────────────────────────────
// 3. MLFQ Priority Boost
//
// Every boostInterval ticks, processes in lower queues are boosted to Level 0.
// ─────────────────────────────────────────────
describe('MLFQ — Priority Boost prevents starvation', () => {
  it('boosts demoted processes back to Level 0 periodically', () => {
    // P1 arrives at t=0 with large burst (30).
    // With boostInterval = 10, boost occurs at t=10 and t=20.
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 25 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 10, burstTime: 2 }),
    ];

    const cfg = defaultConfig({ algorithm: 'MLFQ', agingInterval: 10 });
    const result = runSimulation(processes, createMLFQScheduler({ boostInterval: 10 }), cfg);

    expect(result.processes.every(p => p.state === ProcessState.TERMINATED)).toBe(true);
    expect(result.metrics.totalTime).toBe(27);
  });
});

// ─────────────────────────────────────────────
// 4. Context-Switch Overhead Setting
//
// Inserts idle overhead ticks whenever a new process is dispatched.
// ─────────────────────────────────────────────
describe('Advanced — Context Switch Overhead', () => {
  it('inserts idle ticks equal to contextSwitchCost on each dispatch', () => {
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 2 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 2 }),
    ];

    const cfgWithOverhead = defaultConfig({
      algorithm: 'FCFS',
      contextSwitchCost: 2,
    });

    const result = runSimulation(processes, getScheduler('FCFS'), cfgWithOverhead);

    // Timeline with overhead = 2:
    // t=0-2: Overhead (Idle)
    // t=2-4: P1 runs (burst 2)
    // t=4-6: Overhead (Idle)
    // t=6-8: P2 runs (burst 2)
    const idleBlocks = result.gantt.filter(e => e.pid === null);
    expect(idleBlocks).toHaveLength(2);
    expect(idleBlocks[0]).toMatchObject({ pid: null, start: 0, end: 2 });
    expect(idleBlocks[1]).toMatchObject({ pid: null, start: 4, end: 6 });

    expect(result.metrics.contextSwitches).toBe(2);
    expect(result.metrics.totalTime).toBe(8);
    expect(result.metrics.cpuUtilization).toBeCloseTo(50, 1); // 4 busy / 8 total = 50%
  });
});

// ─────────────────────────────────────────────
// 5. I/O Bursts and WAITING State Verification
//
// P1 has burst 5 and issues a 3-tick I/O after 2 CPU ticks.
// P2 arrives at t=0 with burst 3.
// Timeline:
//   t=0-2: P1 runs 2 CPU ticks.
//   t=2:   P1 transitions to WAITING for 3 ticks (t=2, 3, 4).
//   t=2-5: P2 runs 3 ticks on the CPU.
//   t=5:   P1 completes I/O, transitions WAITING -> READY.
//   t=5-8: P1 resumes and completes remaining 3 CPU ticks.
// ─────────────────────────────────────────────
describe('Advanced — I/O Bursts and WAITING State', () => {
  it('properly transitions process through WAITING state during I/O', () => {
    const processes = [
      createPCB({
        pid: 1,
        name: 'P1',
        arrivalTime: 0,
        burstTime: 5,
        ioBursts: [{ afterCpu: 2, duration: 3 }],
      }),
      createPCB({
        pid: 2,
        name: 'P2',
        arrivalTime: 0,
        burstTime: 3,
      }),
    ];

    const cfg = defaultConfig({ algorithm: 'FCFS', contextSwitchCost: 0 });
    const result = runSimulation(processes, getScheduler('FCFS'), cfg);

    // Gantt chart: P1 runs 0-2, P2 runs 2-5 while P1 is in I/O, P1 resumes 5-8
    expect(result.gantt).toHaveLength(3);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 2 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 2, end: 5 });
    expect(result.gantt[2]).toMatchObject({ pid: 1, start: 5, end: 8 });

    // Verify snapshots at t=2 and t=3 show P1 in waitingQueue
    const snapAt2 = result.snapshots.find(s => s.time === 2)!;
    expect(snapAt2.waitingQueue.some(p => p.pid === 1)).toBe(true);

    // Both processes terminated successfully
    expect(result.processes.every(p => p.state === ProcessState.TERMINATED)).toBe(true);
    expect(result.processes.find(p => p.pid === 1)!.completionTime).toBe(8);
    expect(result.processes.find(p => p.pid === 2)!.completionTime).toBe(5);
  });
});

// ─────────────────────────────────────────────
// Registry lookup
// ─────────────────────────────────────────────
describe('MLFQ — Registry lookup', () => {
  it('is accessible via getScheduler("MLFQ") and getScheduler("Multi-Level Feedback Queue")', () => {
    expect(getScheduler('MLFQ').name).toBe('MLFQ');
    expect(getScheduler('Multi-Level Feedback Queue').name).toBe('MLFQ');
    expect(getScheduler('mlfq').preemptive).toBe(true);
  });
});
