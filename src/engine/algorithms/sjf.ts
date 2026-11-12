// ============================================================
// algorithms/sjf.ts — Shortest Job First (Non-Preemptive)
// NO React imports — pure TypeScript engine code only.
//
// Rules:
//   - Non-preemptive: Once dispatched, runs until completion or I/O.
//   - Dispatches process with smallest burstTime.
//   - Deterministic tie-breaking:
//       1. burstTime (shortest first)
//       2. arrivalTime (earliest first)
//       3. pid (lowest first)
// ============================================================

import { PCB, Scheduler, SimContext } from '../types';
import { sjfComparator } from '../readyQueue';

export const sjfScheduler: Scheduler = {
  name: 'SJF',
  preemptive: false,

  /**
   * Called when a process enters READY.
   * Inserts into readyQueue and maintains SJF order.
   */
  onArrival(p: PCB, ctx: SimContext): void {
    ctx.readyQueue.push(p);
    ctx.readyQueue.sort(sjfComparator);
  },

  /**
   * Selects the process with the shortest burst time.
   */
  pickNext(ctx: SimContext): PCB | null {
    if (ctx.readyQueue.length === 0) return null;
    ctx.readyQueue.sort(sjfComparator);
    return ctx.readyQueue.shift()!;
  },

  /**
   * Non-preemptive: never preempts a running process.
   */
  shouldPreempt(_running: PCB, _ctx: SimContext): boolean {
    return false;
  },
};
