// ============================================================
// algorithms/priority.ts — Priority Scheduling (Preemptive & Non-Preemptive)
// NO React imports — pure TypeScript engine code only.
//
// Rules:
//   - Configurable priority direction:
//       higherPriorityFirst === true (default): lower number = higher priority (e.g. 0 > 1 > 2)
//       higherPriorityFirst === false: higher number = higher priority (e.g. 10 > 5 > 1)
//   - Preemptive variant: Preempts running process if an arriving/ready process
//     has strictly higher priority.
//   - Non-preemptive variant: Never preempts running process.
//   - Tie-breaking:
//       1. Priority
//       2. arrivalTime (earliest first)
//       3. pid (lowest first)
//   - Optional Aging:
//       If agingEnabled is true, every agingInterval ticks, waiting processes
//       in readyQueue have their priority improved to prevent starvation.
// ============================================================

import { PCB, Scheduler, SimContext } from '../types';
import { getPriorityComparator } from '../readyQueue';

/**
 * Helper to determine if process `candidate` has strictly higher priority than `running`.
 */
function hasHigherPriority(candidate: PCB, running: PCB, lowerNumberIsHigher: boolean): boolean {
  if (candidate.priority !== running.priority) {
    return lowerNumberIsHigher
      ? candidate.priority < running.priority
      : candidate.priority > running.priority;
  }
  return false; // Equal priority does not preempt
}

/**
 * Factory to create a Priority Scheduler (preemptive or non-preemptive).
 */
export function createPriorityScheduler(preemptive: boolean): Scheduler {
  const name = preemptive ? 'Priority (Preemptive)' : 'Priority (Non-Preemptive)';

  return {
    name,
    preemptive,

    onArrival(p: PCB, ctx: SimContext): void {
      const lowerNumberIsHigher = ctx.config.higherPriorityFirst ?? true;
      ctx.readyQueue.push(p);
      ctx.readyQueue.sort(getPriorityComparator(lowerNumberIsHigher));
    },

    pickNext(ctx: SimContext): PCB | null {
      if (ctx.readyQueue.length === 0) return null;
      const lowerNumberIsHigher = ctx.config.higherPriorityFirst ?? true;
      ctx.readyQueue.sort(getPriorityComparator(lowerNumberIsHigher));
      return ctx.readyQueue.shift()!;
    },

    shouldPreempt(running: PCB, ctx: SimContext): boolean {
      if (!preemptive || ctx.readyQueue.length === 0) return false;
      const lowerNumberIsHigher = ctx.config.higherPriorityFirst ?? true;
      ctx.readyQueue.sort(getPriorityComparator(lowerNumberIsHigher));
      const candidate = ctx.readyQueue[0];
      return hasHigherPriority(candidate, running, lowerNumberIsHigher);
    },

    onTick(ctx: SimContext): void {
      if (!ctx.config.agingEnabled) return;
      const interval = ctx.config.agingInterval || 10;
      if (interval <= 0) return;

      // Check if this tick is an aging boundary (e.g. at t = 10, 20, 30...)
      if (ctx.currentTime > 0 && ctx.currentTime % interval === 0) {
        const lowerNumberIsHigher = ctx.config.higherPriorityFirst ?? true;
        for (const p of ctx.readyQueue) {
          if (lowerNumberIsHigher) {
            // Priority number decreases towards 0 (higher priority)
            if (p.priority > 0) {
              p.priority--;
            }
          } else {
            // Priority number increases (higher priority)
            p.priority++;
          }
        }
        ctx.readyQueue.sort(getPriorityComparator(lowerNumberIsHigher));
      }
    },
  };
}

export const priorityNonPreemptiveScheduler = createPriorityScheduler(false);
export const priorityPreemptiveScheduler    = createPriorityScheduler(true);

// Default export alias for non-preemptive priority
export const priorityScheduler = priorityNonPreemptiveScheduler;
