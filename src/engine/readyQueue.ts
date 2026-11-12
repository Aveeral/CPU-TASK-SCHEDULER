// ============================================================
// readyQueue.ts — Queue structures for the scheduling engine
// NO React imports — pure TypeScript engine code only.
// ============================================================

import { PCB } from './types';

// ─────────────────────────────────────────────
// 1. FIFO Queue (used by FCFS, Round Robin)
// ─────────────────────────────────────────────

/** A simple FIFO queue backed by an array. */
export class FIFOQueue {
  private queue: PCB[] = [];

  enqueue(p: PCB): void {
    this.queue.push(p);
  }

  dequeue(): PCB | null {
    return this.queue.shift() ?? null;
  }

  peek(): PCB | null {
    return this.queue[0] ?? null;
  }

  get size(): number {
    return this.queue.length;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /** Returns a snapshot copy (does NOT drain the queue). */
  toArray(): PCB[] {
    return [...this.queue];
  }

  clear(): void {
    this.queue = [];
  }
}

// ─────────────────────────────────────────────
// 2. Priority Queue (used by SJF, SRTF, Priority)
// ─────────────────────────────────────────────

/**
 * A comparator-based priority queue.
 * The process for which `compareFn(a, b) < 0` is dequeued first.
 *
 * Uses a simple sorted-insert strategy (O(n) insert, O(1) dequeue).
 * This is fine for typical classroom process counts (≤ 20 processes).
 */
export class PriorityQueue {
  private queue: PCB[];
  private readonly compareFn: (a: PCB, b: PCB) => number;

  constructor(compareFn: (a: PCB, b: PCB) => number) {
    this.queue      = [];
    this.compareFn  = compareFn;
  }

  enqueue(p: PCB): void {
    this.queue.push(p);
    this.queue.sort(this.compareFn);
  }

  dequeue(): PCB | null {
    return this.queue.shift() ?? null;
  }

  peek(): PCB | null {
    return this.queue[0] ?? null;
  }

  /** Re-sort after external mutation (e.g. aging updated priorities). */
  resort(): void {
    this.queue.sort(this.compareFn);
  }

  get size(): number {
    return this.queue.length;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  toArray(): PCB[] {
    return [...this.queue];
  }

  clear(): void {
    this.queue = [];
  }
}

// ─────────────────────────────────────────────
// 3. Standard tie-breaking comparators
// ─────────────────────────────────────────────

/**
 * Secondary tie-breaker: arrival time first, then PID.
 * Used as the final fallback in every scheduler.
 */
export function tieBreak(a: PCB, b: PCB): number {
  if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
  return a.pid - b.pid;
}

/** FCFS comparator: order by arrival time, then PID. */
export function fcfsComparator(a: PCB, b: PCB): number {
  return tieBreak(a, b);
}

/** SJF comparator: shortest burst, then tie-break. */
export function sjfComparator(a: PCB, b: PCB): number {
  if (a.burstTime !== b.burstTime) return a.burstTime - b.burstTime;
  return tieBreak(a, b);
}

/** SRTF comparator: shortest *remaining* time, then tie-break. */
export function srtfComparator(a: PCB, b: PCB): number {
  if (a.remainingTime !== b.remainingTime) return a.remainingTime - b.remainingTime;
  return tieBreak(a, b);
}

/**
 * Factory for priority comparator:
 * lowerNumberIsHigher = true (default): 0 is highest priority (1, 2, 3...)
 * lowerNumberIsHigher = false: larger number is highest priority (...3, 2, 1)
 * Falls through to tie-break on equality (arrival time, then PID).
 */
export function getPriorityComparator(lowerNumberIsHigher: boolean = true) {
  return (a: PCB, b: PCB): number => {
    if (a.priority !== b.priority) {
      return lowerNumberIsHigher ? a.priority - b.priority : b.priority - a.priority;
    }
    return tieBreak(a, b);
  };
}

/**
 * Priority comparator: lower priority number = higher priority (OS convention).
 * Falls through to tie-break on equality.
 */
export const priorityComparator = getPriorityComparator(true);

// ─────────────────────────────────────────────
// 4. Multi-Level Queue (used by MLFQ)
// ─────────────────────────────────────────────

export interface MLFQLevel {
  queue:    FIFOQueue;
  quantum:  number;      // time quantum for this level
}

/**
 * Multi-Level Feedback Queue with configurable levels.
 * Processes are dequeued from the highest-priority non-empty level.
 *
 * Level 0 = highest priority  (smallest quantum, e.g. 4)
 * Level 1 = medium priority   (larger quantum, e.g. 8)
 * Level 2 = lowest priority   (FCFS — no quantum)
 */
export class MultiLevelQueue {
  readonly levels: MLFQLevel[];

  constructor(levelQuantums: number[]) {
    this.levels = levelQuantums.map(q => ({
      queue:   new FIFOQueue(),
      quantum: q,
    }));
  }

  /** Enqueue into a specific level. */
  enqueueAt(levelIndex: number, p: PCB): void {
    if (levelIndex < 0 || levelIndex >= this.levels.length) {
      throw new Error(`MLFQ: invalid level index ${levelIndex}`);
    }
    this.levels[levelIndex].queue.enqueue(p);
  }

  /**
   * Dequeue from the highest-priority non-empty level.
   * Returns { pcb, levelIndex } so the caller knows which level it came from.
   */
  dequeue(): { pcb: PCB; levelIndex: number } | null {
    for (let i = 0; i < this.levels.length; i++) {
      if (!this.levels[i].queue.isEmpty) {
        const pcb = this.levels[i].queue.dequeue()!;
        return { pcb, levelIndex: i };
      }
    }
    return null;
  }

  peek(): { pcb: PCB; levelIndex: number } | null {
    for (let i = 0; i < this.levels.length; i++) {
      const pcb = this.levels[i].queue.peek();
      if (pcb) return { pcb, levelIndex: i };
    }
    return null;
  }

  get isEmpty(): boolean {
    return this.levels.every(l => l.queue.isEmpty);
  }

  get size(): number {
    return this.levels.reduce((sum, l) => sum + l.queue.size, 0);
  }

  /** Returns all queued processes as a flat array (for UI display). */
  toArray(): PCB[] {
    return this.levels.flatMap(l => l.queue.toArray());
  }

  clear(): void {
    this.levels.forEach(l => l.queue.clear());
  }

  /**
   * Priority Boost: moves all processes currently in all queues to Level 0.
   * Preserves relative ordering.
   */
  boostToLevel0(): void {
    const all = this.toArray();
    this.clear();
    for (const p of all) {
      this.levels[0].queue.enqueue(p);
    }
  }
}
