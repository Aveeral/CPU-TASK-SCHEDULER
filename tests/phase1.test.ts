// ============================================================
// Phase 1 Tests — Types, PCB and Ready Queue
// ============================================================

import { describe, it, expect } from 'vitest';
import { ProcessState } from '../src/engine/types';
import { createPCB, transition, clonePCB, describePCB } from '../src/engine/pcb';
import {
  FIFOQueue,
  PriorityQueue,
  MultiLevelQueue,
  tieBreak,
  sjfComparator,
  srtfComparator,
  priorityComparator,
  fcfsComparator,
} from '../src/engine/readyQueue';

// ─────────────────────────────────────────────
// createPCB — factory validation
// ─────────────────────────────────────────────

describe('createPCB', () => {
  it('creates a PCB in the NEW state with correct defaults', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5 });
    expect(p.pid).toBe(1);
    expect(p.name).toBe('P1');
    expect(p.arrivalTime).toBe(0);
    expect(p.burstTime).toBe(5);
    expect(p.remainingTime).toBe(5);
    expect(p.priority).toBe(0);
    expect(p.state).toBe(ProcessState.NEW);
    expect(p.startTime).toBeNull();
    expect(p.completionTime).toBeNull();
    expect(p.waitingTime).toBeNull();
    expect(p.turnaroundTime).toBeNull();
    expect(p.responseTime).toBeNull();
    expect(p.cpuTicksDone).toBe(0);
    expect(p.ioCountdown).toBe(0);
  });

  it('sets priority when provided', () => {
    const p = createPCB({ pid: 2, name: 'P2', arrivalTime: 1, burstTime: 3, priority: 5 });
    expect(p.priority).toBe(5);
  });

  it('throws for zero burst time', () => {
    expect(() =>
      createPCB({ pid: 3, name: 'P3', arrivalTime: 0, burstTime: 0 })
    ).toThrow(/Invalid burstTime/);
  });

  it('throws for negative burst time', () => {
    expect(() =>
      createPCB({ pid: 4, name: 'P4', arrivalTime: 0, burstTime: -1 })
    ).toThrow(/Invalid burstTime/);
  });

  it('throws for negative arrival time', () => {
    expect(() =>
      createPCB({ pid: 5, name: 'P5', arrivalTime: -1, burstTime: 3 })
    ).toThrow(/Invalid arrivalTime/);
  });

  it('stores ioBursts when provided', () => {
    const p = createPCB({
      pid: 6, name: 'P6', arrivalTime: 0, burstTime: 10,
      ioBursts: [{ afterCpu: 3, duration: 2 }],
    });
    expect(p.ioBursts).toHaveLength(1);
    expect(p.ioBursts![0]).toEqual({ afterCpu: 3, duration: 2 });
  });
});

// ─────────────────────────────────────────────
// clonePCB — deep clone
// ─────────────────────────────────────────────

describe('clonePCB', () => {
  it('produces an equal but distinct object', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 4 });
    const c = clonePCB(p);
    expect(c).toEqual(p);
    expect(c).not.toBe(p);
  });

  it('deep-clones ioBursts so mutations do not affect the original', () => {
    const p = createPCB({
      pid: 1, name: 'P1', arrivalTime: 0, burstTime: 10,
      ioBursts: [{ afterCpu: 3, duration: 2 }],
    });
    const c = clonePCB(p);
    c.ioBursts![0].duration = 99;
    expect(p.ioBursts![0].duration).toBe(2);  // original untouched
  });
});

// ─────────────────────────────────────────────
// describePCB — human-readable string
// ─────────────────────────────────────────────

describe('describePCB', () => {
  it('returns a string containing PID, name, state, and arrival', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 2, burstTime: 5 });
    const desc = describePCB(p);
    expect(desc).toContain('PID 1');
    expect(desc).toContain('P1');
    expect(desc).toContain('NEW');
    expect(desc).toContain('arr=2');
  });
});

// ─────────────────────────────────────────────
// Legal state transitions
// ─────────────────────────────────────────────

describe('transition — legal transitions', () => {
  it('NEW → READY', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    transition(p, ProcessState.READY);
    expect(p.state).toBe(ProcessState.READY);
  });

  it('READY → RUNNING', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    transition(p, ProcessState.READY);
    transition(p, ProcessState.RUNNING);
    expect(p.state).toBe(ProcessState.RUNNING);
  });

  it('RUNNING → READY (preemption)', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    transition(p, ProcessState.READY);
    transition(p, ProcessState.RUNNING);
    transition(p, ProcessState.READY);
    expect(p.state).toBe(ProcessState.READY);
  });

  it('RUNNING → WAITING (I/O)', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    transition(p, ProcessState.READY);
    transition(p, ProcessState.RUNNING);
    transition(p, ProcessState.WAITING);
    expect(p.state).toBe(ProcessState.WAITING);
  });

  it('WAITING → READY (I/O complete)', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    transition(p, ProcessState.READY);
    transition(p, ProcessState.RUNNING);
    transition(p, ProcessState.WAITING);
    transition(p, ProcessState.READY);
    expect(p.state).toBe(ProcessState.READY);
  });

  it('RUNNING → TERMINATED', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    transition(p, ProcessState.READY);
    transition(p, ProcessState.RUNNING);
    transition(p, ProcessState.TERMINATED);
    expect(p.state).toBe(ProcessState.TERMINATED);
  });
});

// ─────────────────────────────────────────────
// Illegal state transitions — must throw
// ─────────────────────────────────────────────

describe('transition — illegal transitions (must throw)', () => {
  it('NEW → RUNNING is illegal', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    expect(() => transition(p, ProcessState.RUNNING)).toThrow(/Illegal state transition/);
  });

  it('NEW → TERMINATED is illegal', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    expect(() => transition(p, ProcessState.TERMINATED)).toThrow(/Illegal state transition/);
  });

  it('NEW → WAITING is illegal', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    expect(() => transition(p, ProcessState.WAITING)).toThrow(/Illegal state transition/);
  });

  it('READY → TERMINATED is illegal', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    transition(p, ProcessState.READY);
    expect(() => transition(p, ProcessState.TERMINATED)).toThrow(/Illegal state transition/);
  });

  it('READY → WAITING is illegal', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    transition(p, ProcessState.READY);
    expect(() => transition(p, ProcessState.WAITING)).toThrow(/Illegal state transition/);
  });

  it('RUNNING → NEW is illegal', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    transition(p, ProcessState.READY);
    transition(p, ProcessState.RUNNING);
    expect(() => transition(p, ProcessState.NEW)).toThrow(/Illegal state transition/);
  });

  it('WAITING → RUNNING is illegal', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    transition(p, ProcessState.READY);
    transition(p, ProcessState.RUNNING);
    transition(p, ProcessState.WAITING);
    expect(() => transition(p, ProcessState.RUNNING)).toThrow(/Illegal state transition/);
  });

  it('TERMINATED → READY is illegal', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    transition(p, ProcessState.READY);
    transition(p, ProcessState.RUNNING);
    transition(p, ProcessState.TERMINATED);
    expect(() => transition(p, ProcessState.READY)).toThrow(/Illegal state transition/);
  });

  it('TERMINATED → NEW is illegal', () => {
    const p = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    transition(p, ProcessState.READY);
    transition(p, ProcessState.RUNNING);
    transition(p, ProcessState.TERMINATED);
    expect(() => transition(p, ProcessState.NEW)).toThrow(/Illegal state transition/);
  });
});

// ─────────────────────────────────────────────
// FIFOQueue
// ─────────────────────────────────────────────

describe('FIFOQueue', () => {
  const makeP = (pid: number) =>
    createPCB({ pid, name: `P${pid}`, arrivalTime: pid, burstTime: 3 });

  it('starts empty', () => {
    const q = new FIFOQueue();
    expect(q.isEmpty).toBe(true);
    expect(q.size).toBe(0);
  });

  it('enqueues and dequeues in FIFO order', () => {
    const q = new FIFOQueue();
    const p1 = makeP(1); const p2 = makeP(2); const p3 = makeP(3);
    q.enqueue(p1); q.enqueue(p2); q.enqueue(p3);
    expect(q.dequeue()).toBe(p1);
    expect(q.dequeue()).toBe(p2);
    expect(q.dequeue()).toBe(p3);
  });

  it('dequeue on empty returns null', () => {
    const q = new FIFOQueue();
    expect(q.dequeue()).toBeNull();
  });

  it('peek does not remove the front element', () => {
    const q = new FIFOQueue();
    const p1 = makeP(1);
    q.enqueue(p1);
    expect(q.peek()).toBe(p1);
    expect(q.size).toBe(1);
  });

  it('toArray returns a snapshot without draining', () => {
    const q = new FIFOQueue();
    const p1 = makeP(1); const p2 = makeP(2);
    q.enqueue(p1); q.enqueue(p2);
    const arr = q.toArray();
    expect(arr).toHaveLength(2);
    expect(q.size).toBe(2); // queue intact
  });

  it('clear empties the queue', () => {
    const q = new FIFOQueue();
    q.enqueue(makeP(1));
    q.clear();
    expect(q.isEmpty).toBe(true);
  });
});

// ─────────────────────────────────────────────
// PriorityQueue
// ─────────────────────────────────────────────

describe('PriorityQueue — SJF comparator', () => {
  const makeP = (pid: number, burst: number, arrival = 0) =>
    createPCB({ pid, name: `P${pid}`, arrivalTime: arrival, burstTime: burst });

  it('dequeues shortest-burst first', () => {
    const q = new PriorityQueue(sjfComparator);
    const p1 = makeP(1, 7); const p2 = makeP(2, 3); const p3 = makeP(3, 5);
    q.enqueue(p1); q.enqueue(p2); q.enqueue(p3);
    expect(q.dequeue()!.burstTime).toBe(3);
    expect(q.dequeue()!.burstTime).toBe(5);
    expect(q.dequeue()!.burstTime).toBe(7);
  });

  it('tie-breaks by arrival time then PID', () => {
    const q = new PriorityQueue(sjfComparator);
    // same burst, different arrivals
    const p3 = makeP(3, 5, 2);
    const p1 = makeP(1, 5, 0);
    const p2 = makeP(2, 5, 1);
    q.enqueue(p3); q.enqueue(p1); q.enqueue(p2);
    expect(q.dequeue()!.pid).toBe(1); // earliest arrival
    expect(q.dequeue()!.pid).toBe(2);
    expect(q.dequeue()!.pid).toBe(3);
  });
});

describe('PriorityQueue — priority comparator', () => {
  const makeP = (pid: number, priority: number) =>
    createPCB({ pid, name: `P${pid}`, arrivalTime: 0, burstTime: 3, priority });

  it('dequeues lowest-number (highest-priority) first', () => {
    const q = new PriorityQueue(priorityComparator);
    q.enqueue(makeP(1, 3));
    q.enqueue(makeP(2, 1));
    q.enqueue(makeP(3, 2));
    expect(q.dequeue()!.pid).toBe(2); // priority 1
    expect(q.dequeue()!.pid).toBe(3); // priority 2
    expect(q.dequeue()!.pid).toBe(1); // priority 3
  });
});

describe('PriorityQueue — SRTF comparator', () => {
  it('dequeues shortest remaining time first', () => {
    const p1 = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 7 });
    const p2 = createPCB({ pid: 2, name: 'P2', arrivalTime: 0, burstTime: 4 });
    p1.remainingTime = 5;
    p2.remainingTime = 2;
    const q = new PriorityQueue(srtfComparator);
    q.enqueue(p1); q.enqueue(p2);
    expect(q.dequeue()!.pid).toBe(2);
  });
});

describe('PriorityQueue — tieBreak comparator', () => {
  it('tieBreak returns negative if a arrives before b', () => {
    const a = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    const b = createPCB({ pid: 2, name: 'P2', arrivalTime: 5, burstTime: 3 });
    expect(tieBreak(a, b)).toBeLessThan(0);
  });

  it('tieBreak returns positive if b arrives before a', () => {
    const a = createPCB({ pid: 2, name: 'P2', arrivalTime: 5, burstTime: 3 });
    const b = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    expect(tieBreak(a, b)).toBeGreaterThan(0);
  });

  it('tieBreak breaks ties with PID when arrival is equal', () => {
    const a = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 3 });
    const b = createPCB({ pid: 3, name: 'P3', arrivalTime: 0, burstTime: 3 });
    expect(tieBreak(a, b)).toBeLessThan(0);
  });
});

describe('PriorityQueue — fcfsComparator', () => {
  it('orders by arrival time', () => {
    const q = new PriorityQueue(fcfsComparator);
    const p3 = createPCB({ pid: 3, name: 'P3', arrivalTime: 10, burstTime: 2 });
    const p1 = createPCB({ pid: 1, name: 'P1', arrivalTime: 0, burstTime: 2 });
    const p2 = createPCB({ pid: 2, name: 'P2', arrivalTime: 5, burstTime: 2 });
    q.enqueue(p3); q.enqueue(p1); q.enqueue(p2);
    expect(q.dequeue()!.pid).toBe(1);
    expect(q.dequeue()!.pid).toBe(2);
    expect(q.dequeue()!.pid).toBe(3);
  });
});

// ─────────────────────────────────────────────
// MultiLevelQueue (MLFQ)
// ─────────────────────────────────────────────

describe('MultiLevelQueue', () => {
  const makeP = (pid: number) =>
    createPCB({ pid, name: `P${pid}`, arrivalTime: 0, burstTime: 10 });

  it('initialises with correct levels and quantums', () => {
    const mlq = new MultiLevelQueue([4, 8, 0]);
    expect(mlq.levels).toHaveLength(3);
    expect(mlq.levels[0].quantum).toBe(4);
    expect(mlq.levels[1].quantum).toBe(8);
    expect(mlq.levels[2].quantum).toBe(0); // 0 = FCFS
    expect(mlq.isEmpty).toBe(true);
  });

  it('dequeues from the highest-priority (lowest index) non-empty level', () => {
    const mlq = new MultiLevelQueue([4, 8, 0]);
    const p1 = makeP(1); const p2 = makeP(2);
    mlq.enqueueAt(2, p1); // demoted process in lowest queue
    mlq.enqueueAt(0, p2); // new process in highest queue
    const result = mlq.dequeue();
    expect(result?.pcb.pid).toBe(p2.pid);
    expect(result?.levelIndex).toBe(0);
  });

  it('reports correct size across all levels', () => {
    const mlq = new MultiLevelQueue([4, 8, 0]);
    mlq.enqueueAt(0, makeP(1));
    mlq.enqueueAt(1, makeP(2));
    mlq.enqueueAt(2, makeP(3));
    expect(mlq.size).toBe(3);
  });

  it('toArray returns all processes across all levels', () => {
    const mlq = new MultiLevelQueue([4, 8, 0]);
    mlq.enqueueAt(0, makeP(1));
    mlq.enqueueAt(2, makeP(2));
    expect(mlq.toArray()).toHaveLength(2);
  });

  it('dequeue on empty returns null', () => {
    const mlq = new MultiLevelQueue([4, 8, 0]);
    expect(mlq.dequeue()).toBeNull();
  });

  it('throws for invalid level index', () => {
    const mlq = new MultiLevelQueue([4, 8, 0]);
    expect(() => mlq.enqueueAt(5, makeP(1))).toThrow(/invalid level index/);
    expect(() => mlq.enqueueAt(-1, makeP(1))).toThrow(/invalid level index/);
  });

  it('clear empties all levels', () => {
    const mlq = new MultiLevelQueue([4, 8, 0]);
    mlq.enqueueAt(0, makeP(1));
    mlq.enqueueAt(1, makeP(2));
    mlq.clear();
    expect(mlq.isEmpty).toBe(true);
    expect(mlq.size).toBe(0);
  });
});
