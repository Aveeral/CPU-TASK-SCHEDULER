// ============================================================
// algorithms/srtf.ts — Shortest Remaining Time First (Preemptive SJF)
// NO React imports — pure TypeScript engine code only.
//
// Rules:
//   - Preemptive: A running process is preempted if an arrived/ready process
//     has a strictly smaller remainingTime.
//   - Preemption tie-break: Does NOT preempt if remaining times are equal
//     (avoids unnecessary context switches).
//   - Ready queue tie-breaking:
//       1. remainingTime (shortest first)
//       2. arrivalTime (earliest first)
//       3. pid (lowest first)
// ============================================================

import { PCB, Scheduler, SimContext } from '../types';
import { srtfComparator } from '../readyQueue';

export const srtfScheduler: Scheduler = {
  name: 'SRTF',
  preemptive: true,

  /**
   * Called when a process enters READY (new arrival or preempted).
   * Inserts into readyQueue and sorts by remaining time then tie-breaks.
   */
  onArrival(p: PCB, ctx: SimContext): void {
    ctx.readyQueue.push(p);
    ctx.readyQueue.sort(srtfComparator);
  },

  /**
   * Dispatches the process with the shortest remaining time.
   */
  pickNext(ctx: SimContext): PCB | null {
    if (ctx.readyQueue.length === 0) return null;
    ctx.readyQueue.sort(srtfComparator);
    return ctx.readyQueue.shift()!;
  },

  /**
   * Preempts if any ready process has strictly less remaining time than the running process.
   */
  shouldPreempt(running: PCB, ctx: SimContext): boolean {
    if (ctx.readyQueue.length === 0) return false;
    ctx.readyQueue.sort(srtfComparator);
    const candidate = ctx.readyQueue[0];
    return candidate.remainingTime < running.remainingTime;
  },
};
