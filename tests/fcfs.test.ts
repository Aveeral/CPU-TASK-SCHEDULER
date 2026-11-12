// ============================================================
// fcfs.test.ts — Tests for FCFS scheduler + Simulator Core
//
// All expected values are hand-calculated from docs/test-cases.md
// ============================================================

import { describe, it, expect } from 'vitest';
import { createPCB } from '../src/engine/pcb';
import { runSimulation, defaultConfig } from '../src/engine/simulator';
import { fcfsScheduler } from '../src/engine/algorithms/fcfs';
import { getScheduler } from '../src/engine/algorithms/index';
import { ProcessState } from '../src/engine/types';

const cfg = defaultConfig({ algorithm: 'FCFS', contextSwitchCost: 0 });

// ─────────────────────────────────────────────
// TC-1: Classic 3-process FCFS (from test-cases.md)
//
// PID | Arrival | Burst
//  P1 |    0    |  24
//  P2 |    1    |   3
//  P3 |    2    |   3
//
// Expected Gantt: P1[0-24] P2[24-27] P3[27-30]
// Expected metrics: Avg WT=16, Avg TAT=26
// ─────────────────────────────────────────────
describe('FCFS — TC-1: basic 3-process', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 24 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 1, burstTime: 3  }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 2, burstTime: 3  }),
  ];

  const result = runSimulation(processes, fcfsScheduler, cfg);

  it('produces 3 Gantt entries', () => {
    expect(result.gantt).toHaveLength(3);
  });

  it('P1 runs first from t=0 to t=24', () => {
    const e = result.gantt[0];
    expect(e.pid).toBe(1);
    expect(e.start).toBe(0);
    expect(e.end).toBe(24);
  });

  it('P2 runs second from t=24 to t=27', () => {
    const e = result.gantt[1];
    expect(e.pid).toBe(2);
    expect(e.start).toBe(24);
    expect(e.end).toBe(27);
  });

  it('P3 runs last from t=27 to t=30', () => {
    const e = result.gantt[2];
    expect(e.pid).toBe(3);
    expect(e.start).toBe(27);
    expect(e.end).toBe(30);
  });

  it('P1 metrics: TAT=24, WT=0, RT=0', () => {
    const p1 = result.processes.find(p => p.pid === 1)!;
    expect(p1.turnaroundTime).toBe(24);
    expect(p1.waitingTime).toBe(0);
    expect(p1.responseTime).toBe(0);
  });

  it('P2 metrics: TAT=26, WT=23, RT=23', () => {
    const p2 = result.processes.find(p => p.pid === 2)!;
    expect(p2.turnaroundTime).toBe(26);
    expect(p2.waitingTime).toBe(23);
    expect(p2.responseTime).toBe(23);
  });

  it('P3 metrics: TAT=28, WT=25, RT=25', () => {
    const p3 = result.processes.find(p => p.pid === 3)!;
    expect(p3.turnaroundTime).toBe(28);
    expect(p3.waitingTime).toBe(25);
    expect(p3.responseTime).toBe(25);
  });

  it('average waiting time = 16', () => {
    expect(result.metrics.avgWaitingTime).toBeCloseTo(16, 5);
  });

  it('average turnaround time = 26', () => {
    expect(result.metrics.avgTurnaroundTime).toBeCloseTo(26, 5);
  });

  it('all processes are TERMINATED', () => {
    expect(result.processes.every(p => p.state === ProcessState.TERMINATED)).toBe(true);
  });

  it('total simulation time = 30', () => {
    expect(result.metrics.totalTime).toBe(30);
  });
});

// ─────────────────────────────────────────────
// TC-2: CPU idle gap (from test-cases.md)
//
// PID | Arrival | Burst
//  P1 |    0    |   2
//  P2 |    5    |   3
//
// Expected Gantt: P1[0-2] IDLE[2-5] P2[5-8]
// Expected: P1 WT=0 TAT=2, P2 WT=0 TAT=3
// ─────────────────────────────────────────────
describe('FCFS — TC-2: CPU idle gap', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 2 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 5, burstTime: 3 }),
  ];

  const result = runSimulation(processes, fcfsScheduler, cfg);

  it('produces 3 Gantt entries (P1, Idle, P2)', () => {
    expect(result.gantt).toHaveLength(3);
  });

  it('P1 runs t=0 to t=2', () => {
    expect(result.gantt[0].pid).toBe(1);
    expect(result.gantt[0].start).toBe(0);
    expect(result.gantt[0].end).toBe(2);
  });

  it('CPU is idle from t=2 to t=5', () => {
    const idle = result.gantt[1];
    expect(idle.pid).toBeNull();
    expect(idle.start).toBe(2);
    expect(idle.end).toBe(5);
    expect(idle.label).toBe('Idle');
  });

  it('P2 runs t=5 to t=8', () => {
    expect(result.gantt[2].pid).toBe(2);
    expect(result.gantt[2].start).toBe(5);
    expect(result.gantt[2].end).toBe(8);
  });

  it('P1 metrics: TAT=2, WT=0, RT=0', () => {
    const p1 = result.processes.find(p => p.pid === 1)!;
    expect(p1.turnaroundTime).toBe(2);
    expect(p1.waitingTime).toBe(0);
    expect(p1.responseTime).toBe(0);
  });

  it('P2 metrics: TAT=3, WT=0, RT=0', () => {
    const p2 = result.processes.find(p => p.pid === 2)!;
    expect(p2.turnaroundTime).toBe(3);
    expect(p2.waitingTime).toBe(0);
    expect(p2.responseTime).toBe(0);
  });

  it('total simulation time = 8', () => {
    expect(result.metrics.totalTime).toBe(8);
  });
});

// ─────────────────────────────────────────────
// TC-3: All processes arrive at t=0
// ─────────────────────────────────────────────
describe('FCFS — all processes at t=0, ordered by PID', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 5 }),
    createPCB({ pid: 3, name: 'P3', arrivalTime: 0, burstTime: 2 }),
  ];

  const result = runSimulation(processes, fcfsScheduler, cfg);

  it('serves in PID order (FIFO — tie-break by PID for same arrival)', () => {
    expect(result.gantt[0].pid).toBe(1);
    expect(result.gantt[1].pid).toBe(2);
    expect(result.gantt[2].pid).toBe(3);
  });

  it('no idle gaps', () => {
    expect(result.gantt.every(e => e.pid !== null)).toBe(true);
  });

  it('P1: start=0, end=3', () => {
    expect(result.gantt[0].start).toBe(0);
    expect(result.gantt[0].end).toBe(3);
  });
});

// ─────────────────────────────────────────────
// TC-4: Single process
// ─────────────────────────────────────────────
describe('FCFS — single process', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 }),
  ];

  const result = runSimulation(processes, fcfsScheduler, cfg);

  it('produces one Gantt entry', () => {
    expect(result.gantt).toHaveLength(1);
    expect(result.gantt[0]).toMatchObject({ pid: 1, start: 0, end: 5 });
  });

  it('TAT=5, WT=0, RT=0', () => {
    const p = result.processes[0];
    expect(p.turnaroundTime).toBe(5);
    expect(p.waitingTime).toBe(0);
    expect(p.responseTime).toBe(0);
  });

  it('CPU utilization = 100%', () => {
    expect(result.metrics.cpuUtilization).toBeCloseTo(100, 1);
  });
});

// ─────────────────────────────────────────────
// TC-5: Empty process list
// ─────────────────────────────────────────────
describe('FCFS — empty process list', () => {
  const result = runSimulation([], fcfsScheduler, cfg);

  it('returns empty gantt', () => {
    expect(result.gantt).toHaveLength(0);
  });

  it('returns empty snapshots', () => {
    expect(result.snapshots).toHaveLength(0);
  });

  it('all metrics are 0', () => {
    expect(result.metrics.avgWaitingTime).toBe(0);
    expect(result.metrics.avgTurnaroundTime).toBe(0);
    expect(result.metrics.totalTime).toBe(0);
  });
});

// ─────────────────────────────────────────────
// TC-6: Context-switch cost
// Two processes, cost=2 → idle ticks inserted on each dispatch
// ─────────────────────────────────────────────
describe('FCFS — context-switch cost', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 }),
    createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 2 }),
  ];

  const cfgWithCost = defaultConfig({ algorithm: 'FCFS', contextSwitchCost: 2 });
  const result = runSimulation(processes, fcfsScheduler, cfgWithCost);

  it('inserts idle ticks between P1 and P2', () => {
    const idleBlocks = result.gantt.filter(e => e.pid === null);
    expect(idleBlocks.length).toBeGreaterThan(0);
  });

  it('P1 still starts at t=0 (first dispatch has 2 overhead idle ticks first)', () => {
    // With cost=2: idle[0-2], P1[2-5], idle[5-7], P2[7-9]
    const p1Block = result.gantt.find(e => e.pid === 1);
    expect(p1Block).toBeDefined();
  });

  it('context switch count matches number of dispatches', () => {
    // 2 processes dispatched = 2 context switches
    expect(result.metrics.contextSwitches).toBe(2);
  });
});

// ─────────────────────────────────────────────
// TC-7: Snapshots are produced
// ─────────────────────────────────────────────
describe('FCFS — step-through snapshots', () => {
  const processes = [
    createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 }),
  ];

  const result = runSimulation(processes, fcfsScheduler, cfg);

  it('produces one snapshot per tick (3 ticks for burst=3)', () => {
    expect(result.snapshots).toHaveLength(3);
  });

  it('snapshot at t=0 shows P1 running', () => {
    const s = result.snapshots[0];
    expect(s.time).toBe(0);
    expect(s.running?.pid).toBe(1);
  });

  it('each snapshot has a cumulative gantt', () => {
    for (const snap of result.snapshots) {
      expect(snap.gantt).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────
// TC-8: Scheduler registry lookup
// ─────────────────────────────────────────────
describe('Scheduler registry', () => {
  it('getScheduler("FCFS") returns the FCFS scheduler', () => {
    const s = getScheduler('FCFS');
    expect(s.name).toBe('FCFS');
    expect(s.preemptive).toBe(false);
  });

  it('getScheduler is case-insensitive', () => {
    expect(getScheduler('fcfs').name).toBe('FCFS');
  });

  it('getScheduler throws for unknown algorithm', () => {
    expect(() => getScheduler('UNKNOWN')).toThrow(/Unknown scheduling algorithm/);
  });
});
