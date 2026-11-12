// ============================================================
// algorithms/mlfq.ts — Multi-Level Feedback Queue Scheduler
// NO React imports — pure TypeScript engine code only.
//
// Rules (from OS theory / OSTEP):
//   - 3 Priority Levels:
//       Level 0: Round Robin with quantum = 4 (highest priority)
//       Level 1: Round Robin with quantum = 8 (medium priority)
//       Level 2: FCFS (quantum = 0, lowest priority)
//   - Demotion on quantum exhaustion:
//       When a process exhausts its quantum at Level L, it is demoted to min(L + 1, 2).
//   - Preemption on higher level arrival:
//       Processes in higher queues always strictly preempt processes in lower queues.
//   - Priority Boost (Rule 5):
//       Every boostInterval ticks (default 50), all processes in the system are
//       promoted back to Level 0 to prevent starvation.
// ============================================================

import { PCB, Scheduler, SimContext } from '../types';
import { MultiLevelQueue } from '../readyQueue';

export interface MLFQOptions {
  levelQuantums?: number[]; // default: [4, 8, 0] (0 = FCFS)
  boostInterval?: number;   // default: 50 ticks
}

export function createMLFQScheduler(options?: MLFQOptions): Scheduler {
  const quantums = options?.levelQuantums ?? [4, 8, 0];
  const mlq      = new MultiLevelQueue(quantums);

  // Maps PID to its current queue level (0, 1, or 2)
  const processLevel = new Map<number, number>();

  let currentProcess:   PCB | null = null;
  let currentLevel:     number     = 0;
  let currentSliceUsed: number     = 0;

  return {
    name: 'MLFQ',
    preemptive: true,

    /**
     * Called when a process enters READY.
     * New processes start at Level 0.
     * Preempted or unblocked processes enter their designated level.
     */
    onArrival(p: PCB, ctx: SimContext): void {
      if (ctx.currentTime === 0 && mlq.size === 0) {
        processLevel.clear();
      }

      if (!processLevel.has(p.pid)) {
        processLevel.set(p.pid, 0); // New arrival starts at top priority
      }

      const level = processLevel.get(p.pid) ?? 0;
      mlq.enqueueAt(level, p);
      ctx.readyQueue = mlq.toArray();
    },

    /**
     * Dispatches from the highest-priority non-empty level.
     */
    pickNext(ctx: SimContext): PCB | null {
      const next = mlq.dequeue();
      if (!next) {
        ctx.readyQueue = [];
        return null;
      }

      currentProcess   = next.pcb;
      currentLevel     = next.levelIndex;
      currentSliceUsed = 0;
      ctx.readyQueue   = mlq.toArray();
      return next.pcb;
    },

    /**
     * Preempts if:
     * 1. A process arrived in a strictly higher queue level.
     * 2. The running process exhausted its quantum at its current level.
     */
    shouldPreempt(_running: PCB, ctx: SimContext): boolean {
      if (ctx.currentTime === 0) {
        currentProcess   = null;
        currentLevel     = 0;
        currentSliceUsed = 0;
      }

      // Check 1: Higher priority queue has a waiting process
      const peeked = mlq.peek();
      if (peeked && peeked.levelIndex < currentLevel) {
        // Preempt to yield to higher priority queue!
        // Running process does not exhaust quantum, so level is preserved.
        currentProcess   = null;
        currentSliceUsed = 0;
        return true;
      }

      // Check 2: Quantum expiration at current level
      const q = quantums[currentLevel];
      if (q > 0 && currentSliceUsed >= q) {
        // Demote process to next lower level
        const nextLevel = Math.min(currentLevel + 1, quantums.length - 1);
        if (currentProcess) {
          processLevel.set(currentProcess.pid, nextLevel);
        }

        if (!mlq.isEmpty) {
          // Other processes ready -> preempt
          currentProcess   = null;
          currentSliceUsed = 0;
          return true;
        } else {
          // No other processes -> continue execution in demoted level
          currentLevel     = nextLevel;
          currentSliceUsed = 0;
          return false;
        }
      }

      return false;
    },

    /**
     * Tracks execution slice and triggers periodic priority boost.
     */
    onTick(ctx: SimContext): void {
      if (ctx.currentTime === 0 && currentSliceUsed > 0) {
        currentProcess   = null;
        currentSliceUsed = 0;
        currentLevel     = 0;
        processLevel.clear();
      }

      const running = ctx.running;
      if (running) {
        if (currentProcess !== running) {
          currentProcess   = running;
          currentLevel     = processLevel.get(running.pid) ?? 0;
          currentSliceUsed = 0;
        }
        currentSliceUsed++;
      } else {
        currentProcess   = null;
        currentSliceUsed = 0;
      }

      // Priority Boost check (every boostInterval ticks)
      const boostInt = options?.boostInterval ?? (ctx.config.agingInterval || 50);
      if (boostInt > 0 && ctx.currentTime > 0 && ctx.currentTime % boostInt === 0) {
        mlq.boostToLevel0();
        // Reset all process levels to 0
        for (const pid of processLevel.keys()) {
          processLevel.set(pid, 0);
        }
        if (currentProcess) {
          processLevel.set(currentProcess.pid, 0);
          currentLevel = 0;
        }
        ctx.readyQueue = mlq.toArray();
      }
    },
  };
}

export const mlfqScheduler = createMLFQScheduler();
