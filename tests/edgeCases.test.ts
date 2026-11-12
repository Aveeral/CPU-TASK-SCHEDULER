// ============================================================
// tests/edgeCases.test.ts — Phase 8: Rigorous Edge Case Testing
//
// Covers all edge cases mandated by the OS project plan:
//   1. A single process
//   2. All processes arriving at t=0
//   3. A gap between arrivals (CPU Idle gaps)
//   4. Equal burst times (deterministic tie-breaking)
//   5. Burst = 1 (completes on first tick)
//   6. Identical priorities
//   7. An empty process list
//   8. Invalid input (negative/zero burst, negative arrival)
// ============================================================

import { describe, it, expect } from 'vitest';
import { createPCB, transition } from '../src/engine/pcb';
import { runSimulation, defaultConfig } from '../src/engine/simulator';
import { fcfsScheduler } from '../src/engine/algorithms/fcfs';
import { sjfScheduler } from '../src/engine/algorithms/sjf';
import { srtfScheduler } from '../src/engine/algorithms/srtf';
import { createRoundRobinScheduler } from '../src/engine/algorithms/roundRobin';
import {
  priorityNonPreemptiveScheduler,
  priorityPreemptiveScheduler,
} from '../src/engine/algorithms/priority';
import { createMLFQScheduler } from '../src/engine/algorithms/mlfq';
import { ProcessState } from '../src/engine/types';

// ─────────────────────────────────────────────
// 1. Single Process
// ─────────────────────────────────────────────
describe('Edge Case 1 — Single Process across all algorithms', () => {
  const schedulers = [
    { name: 'FCFS',     scheduler: fcfsScheduler },
    { name: 'SJF',      scheduler: sjfScheduler },
    { name: 'SRTF',     scheduler: srtfScheduler },
    { name: 'RR (q=2)', scheduler: createRoundRobinScheduler(2) },
    { name: 'Priority', scheduler: priorityNonPreemptiveScheduler },
    { name: 'MLFQ',     scheduler: createMLFQScheduler() },
  ];

  for (const { name, scheduler } of schedulers) {
    it(`handles a single process in ${name} without slicing or errors`, () => {
      const processes = [createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 6 })];
      const cfg = defaultConfig({ algorithm: name, timeQuantum: 2 });
      const result = runSimulation(processes, scheduler, cfg);

      expect(result.gantt).toHaveLength(1);
      expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 6 });

      const p1 = result.processes[0];
      expect(p1.state).toBe(ProcessState.TERMINATED);
      expect(p1.startTime).toBe(0);
      expect(p1.completionTime).toBe(6);
      expect(p1.turnaroundTime).toBe(6);
      expect(p1.waitingTime).toBe(0);
      expect(p1.responseTime).toBe(0);

      expect(result.metrics.cpuUtilization).toBeCloseTo(100);
      expect(result.metrics.throughput).toBeCloseTo(1 / 6);
    });
  }
});

// ─────────────────────────────────────────────
// 2. All processes arriving at t=0
// ─────────────────────────────────────────────
describe('Edge Case 2 — All processes arriving at t=0', () => {
  it('schedules without any idle time at start', () => {
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 4 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 2 }),
      createPCB({ pid: 3, name: 'P3', arrivalTime: 0, burstTime: 1 }),
    ];

    const result = runSimulation(processes, sjfScheduler, defaultConfig({ algorithm: 'SJF' }));

    // In SJF: P3(1) -> P2(2) -> P1(4)
    expect(result.gantt[0]).toMatchObject({ pid: 3, start: 0, end: 1 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 1, end: 3 });
    expect(result.gantt[2]).toMatchObject({ pid: 1, start: 3, end: 7 });

    // No idle gaps
    expect(result.gantt.every((g) => g.pid !== null)).toBe(true);
    expect(result.metrics.cpuUtilization).toBeCloseTo(100);
  });
});

// ─────────────────────────────────────────────
// 3. Gap between arrivals (CPU Idle time)
// ─────────────────────────────────────────────
describe('Edge Case 3 — Gaps between arrivals (CPU Idle time)', () => {
  it('correctly records idle time gap between process executions', () => {
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0,  burstTime: 2 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 10, burstTime: 3 }),
    ];

    const result = runSimulation(processes, fcfsScheduler, defaultConfig());

    // Gantt: P1[0-2], Idle[2-10], P2[10-13]
    expect(result.gantt).toHaveLength(3);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 2 });
    expect(result.gantt[1]).toMatchObject({ pid: null, label: 'Idle', start: 2, end: 10 });
    expect(result.gantt[2]).toMatchObject({ pid: 2, start: 10, end: 13 });

    // Both processes waited 0 ticks because CPU was free when they arrived
    expect(result.processes.find((p) => p.pid === 1)!.waitingTime).toBe(0);
    expect(result.processes.find((p) => p.pid === 2)!.waitingTime).toBe(0);

    // CPU utilization = (2 + 3) / 13 = 38.46%
    expect(result.metrics.cpuUtilization).toBeCloseTo((5 / 13) * 100, 2);
    expect(result.metrics.totalTime).toBe(13);
  });
});

// ─────────────────────────────────────────────
// 4. Equal burst times (deterministic tie-breaking)
// ─────────────────────────────────────────────
describe('Edge Case 4 — Equal burst times tie-breaking', () => {
  it('breaks ties by arrival time when burst times are equal in SJF', () => {
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 2, burstTime: 3 }),
      createPCB({ pid: 3, name: 'P3', arrivalTime: 1, burstTime: 3 }),
    ];

    const result = runSimulation(processes, sjfScheduler, defaultConfig());

    // P1 runs 0-3. At t=3, both P2 (arr 2) and P3 (arr 1) are ready with burst 3.
    // P3 arrived earlier than P2 -> P3 must run next!
    expect(result.gantt[0].pid).toBe(1);
    expect(result.gantt[1].pid).toBe(3);
    expect(result.gantt[2].pid).toBe(2);
  });

  it('breaks ties by PID when both burst and arrival are equal', () => {
    const processes = [
      createPCB({ pid: 4, name: 'P4', arrivalTime: 0, burstTime: 2 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 2 }),
      createPCB({ pid: 5, name: 'P5', arrivalTime: 0, burstTime: 2 }),
    ];

    const result = runSimulation(processes, sjfScheduler, defaultConfig());

    // Lowest PID first: P2 -> P4 -> P5
    expect(result.gantt[0].pid).toBe(2);
    expect(result.gantt[1].pid).toBe(4);
    expect(result.gantt[2].pid).toBe(5);
  });
});

// ─────────────────────────────────────────────
// 5. Burst = 1
// ─────────────────────────────────────────────
describe('Edge Case 5 — Burst = 1', () => {
  it('completes on the very first execution tick in FCFS and SJF', () => {
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 1 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 1 }),
    ];

    const result = runSimulation(processes, fcfsScheduler, defaultConfig());

    expect(result.gantt).toHaveLength(2);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 1 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 1, end: 2 });

    const p1 = result.processes.find((p) => p.pid === 1)!;
    expect(p1.turnaroundTime).toBe(1);
    expect(p1.waitingTime).toBe(0);
    expect(p1.responseTime).toBe(0);
  });

  it('Round Robin terminates burst=1 immediately without waiting for quantum', () => {
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 1 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 1 }),
    ];

    // Quantum is 4, but burst is only 1
    const result = runSimulation(processes, createRoundRobinScheduler(4), defaultConfig({ timeQuantum: 4 }));

    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 1 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 1, end: 2 });
  });
});

// ─────────────────────────────────────────────
// 6. Identical priorities
// ─────────────────────────────────────────────
describe('Edge Case 6 — Identical priorities', () => {
  it('tie-breaks identical priorities by arrival time in Priority scheduling', () => {
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 4, priority: 2 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 2, burstTime: 2, priority: 2 }),
      createPCB({ pid: 3, name: 'P3', arrivalTime: 1, burstTime: 2, priority: 2 }),
    ];

    const result = runSimulation(processes, priorityNonPreemptiveScheduler, defaultConfig());

    // P1 runs 0-4. At t=4, P2 and P3 have priority 2. P3 arrived earlier (t=1 vs 2) -> P3 runs next.
    expect(result.gantt[0].pid).toBe(1);
    expect(result.gantt[1].pid).toBe(3);
    expect(result.gantt[2].pid).toBe(2);
  });

  it('Preemptive Priority does NOT preempt when arrived process has equal priority', () => {
    const processes = [
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5, priority: 1 }),
      createPCB({ pid: 2, name: 'P2', arrivalTime: 2, burstTime: 2, priority: 1 }),
    ];

    const result = runSimulation(processes, priorityPreemptiveScheduler, defaultConfig());

    // P1 should continue without interruption because P2 has equal (not higher) priority
    expect(result.gantt).toHaveLength(2);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 5 });
    expect(result.gantt[1]).toMatchObject({ pid: 2, start: 5, end: 7 });
  });
});

// ─────────────────────────────────────────────
// 7. Empty process list
// ─────────────────────────────────────────────
describe('Edge Case 7 — Empty process list', () => {
  it('returns empty results without crashing or throwing divide-by-zero errors', () => {
    const result = runSimulation([], fcfsScheduler, defaultConfig());

    expect(result.gantt).toHaveLength(0);
    expect(result.snapshots).toHaveLength(0);
    expect(result.processes).toHaveLength(0);

    expect(result.metrics.avgWaitingTime).toBe(0);
    expect(result.metrics.avgTurnaroundTime).toBe(0);
    expect(result.metrics.avgResponseTime).toBe(0);
    expect(result.metrics.cpuUtilization).toBe(0);
    expect(result.metrics.throughput).toBe(0);
    expect(result.metrics.totalTime).toBe(0);
  });
});

// ─────────────────────────────────────────────
// 8. Invalid input validation
// ─────────────────────────────────────────────
describe('Edge Case 8 — Invalid input validation', () => {
  it('throws an error if burstTime is 0', () => {
    expect(() =>
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 0 })
    ).toThrow(/Invalid burstTime/);
  });

  it('throws an error if burstTime is negative', () => {
    expect(() =>
      createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: -5 })
    ).toThrow(/Invalid burstTime/);
  });

  it('throws an error if arrivalTime is negative', () => {
    expect(() =>
      createPCB({ pid: 1, name: 'P1', arrivalTime: -3, burstTime: 4 })
    ).toThrow(/Invalid arrivalTime/);
  });

  it('throws an error on illegal state transition (e.g. TERMINATED -> RUNNING)', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 2 });
    transition(p, ProcessState.READY);
    transition(p, ProcessState.RUNNING);
    transition(p, ProcessState.TERMINATED);

    expect(() => transition(p, ProcessState.RUNNING)).toThrow(/Illegal state transition/);
    expect(() => transition(p, ProcessState.READY)).toThrow(/Illegal state transition/);
  });
});
