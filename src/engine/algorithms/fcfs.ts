// ============================================================
// algorithms/fcfs.ts — First-Come, First-Served scheduler
// NO React imports — pure TypeScript engine code only.
//
// Rules:
//   - Non-preemptive
//   - Processes served in arrival order
//   - Tie-break: arrival time first, then PID (handled naturally by FIFO)
// ============================================================

import { PCB, Scheduler, SimContext } from '../types';

export const fcfsScheduler: Scheduler = {
  name:       'FCFS',
  preemptive: false,

  /**
   * Called when a process transitions NEW → READY.
   * FCFS simply appends to the back of the ready queue (FIFO order).
   */
  onArrival(p: PCB, ctx: SimContext): void {
    ctx.readyQueue.push(p);
  },

  /**
   * Pick the next process to run: take the first one in the queue.
   * Returns null if the queue is empty (CPU will be idle).
   */
  pickNext(ctx: SimContext): PCB | null {
    if (ctx.readyQueue.length === 0) return null;
    return ctx.readyQueue.shift()!;
  },

  /**
   * FCFS never preempts.
   */
  shouldPreempt(_running: PCB, _ctx: SimContext): boolean {
    return false;
  },

  // No onTick hook needed for FCFS
};
