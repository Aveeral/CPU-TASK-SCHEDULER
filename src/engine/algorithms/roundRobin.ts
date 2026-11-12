// ============================================================
// algorithms/roundRobin.ts — Round Robin Scheduler
// NO React imports — pure TypeScript engine code only.
//
// Rules:
//   - Preemptive: Processes execute for at most a fixed time quantum.
//   - FIFO ready queue: Dispatches from the front, appends to the back.
//   - Quantum countdown: Resets whenever a new process is dispatched.
//   - If quantum expires and other processes are ready:
//       Preempt running process and append to the back of readyQueue.
//   - If quantum expires but readyQueue is empty:
//       Running process renews its quantum and continues without interruption.
//   - Arrival vs. Preemption order at the same tick (Step 1 vs Step 3):
//       Newly arriving processes are admitted into readyQueue in Step 1.
//       Preempted processes whose quantum expired are appended in Step 3.
//       Therefore, newly arrived processes are enqueued BEFORE a preempted process.
// ============================================================

import { PCB, Scheduler, SimContext } from '../types';

export function createRoundRobinScheduler(fixedQuantum?: number): Scheduler {
  let currentProcess: PCB | null = null;
  let currentQuantumUsed: number = 0;

  return {
    name: 'Round Robin',
    preemptive: true,

    /**
     * Called when a process enters READY (arrival or quantum preemption).
     * Round Robin appends to the tail of the ready queue (FIFO).
     */
    onArrival(p: PCB, ctx: SimContext): void {
      ctx.readyQueue.push(p);
    },

    /**
     * Dispatches the next process from the front of the ready queue.
     */
    pickNext(ctx: SimContext): PCB | null {
      if (ctx.readyQueue.length === 0) return null;
      return ctx.readyQueue.shift()!;
    },

    /**
     * Preempts running process if its quantum has expired and other processes are waiting.
     */
    shouldPreempt(_running: PCB, ctx: SimContext): boolean {
      if (ctx.currentTime === 0) {
        currentProcess = null;
        currentQuantumUsed = 0;
      }

      const q = fixedQuantum ?? ctx.config.timeQuantum ?? 4;
      if (currentQuantumUsed >= q) {
        if (ctx.readyQueue.length > 0) {
          // Quantum expired and there are other processes waiting -> preempt
          currentQuantumUsed = 0;
          currentProcess = null;
          return true;
        } else {
          // Ready queue is empty -> renew quantum and continue running
          currentQuantumUsed = 0;
          return false;
        }
      }
      return false;
    },

    /**
     * Increments the quantum counter for the currently running process each tick.
     */
    onTick(ctx: SimContext): void {
      if (ctx.currentTime === 0 && currentQuantumUsed > 0) {
        currentProcess = null;
        currentQuantumUsed = 0;
      }

      const running = ctx.running;
      if (running) {
        if (currentProcess !== running) {
          currentProcess = running;
          currentQuantumUsed = 0;
        }
        currentQuantumUsed++;
      } else {
        currentProcess = null;
        currentQuantumUsed = 0;
      }
    },
  };
}

export const roundRobinScheduler = createRoundRobinScheduler();
