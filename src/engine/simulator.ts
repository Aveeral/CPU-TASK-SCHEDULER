// ============================================================
// simulator.ts — Tick-driven simulation engine
// NO React imports — pure TypeScript engine code only.
//
// Tick order (from design.md):
//   1. Admit arrivals       (NEW → READY)
//   2. Update I/O queue     (WAITING → READY when done)
//   3. Check preemption
//   4. Dispatch             (apply context-switch cost if configured)
//   5. Execute 1 tick
//   6. Handle completion / burst end
//   7. Record Gantt entry + snapshot
// ============================================================

import {
  PCB,
  ProcessState,
  SimConfig,
  SimContext,
  SimResult,
  GanttEntry,
  SimSnapshot,
  AggregateMetrics,
  Scheduler,
} from './types';
import { computeAggregateMetrics } from './metrics';
import { transition, clonePCB } from './pcb';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Returns a sensible default config (no overhead, quantum=4). */
export function defaultConfig(overrides: Partial<SimConfig> = {}): SimConfig {
  return {
    algorithm:           'FCFS',
    timeQuantum:         4,
    contextSwitchCost:   0,
    higherPriorityFirst: true,
    agingEnabled:        false,
    agingInterval:       10,
    ...overrides,
  };
}

/** Returns an empty AggregateMetrics object (used when process list is empty). */
function emptyMetrics(): AggregateMetrics {
  return {
    avgWaitingTime:    0,
    avgTurnaroundTime: 0,
    avgResponseTime:   0,
    cpuUtilization:    0,
    throughput:        0,
    contextSwitches:   0,
    totalTime:         0,
  };
}

/** Deep-snapshot of the current simulation state for the step-through UI. */
function makeSnapshot(
  t: number,
  running: PCB | null,
  ctx: SimContext,
  gantt: GanttEntry[],
  openBlock: { pid: number | null; start: number } | null
): SimSnapshot {
  // Include the currently open (not yet closed) Gantt block in the snapshot
  // so the step-through UI always shows the full picture.
  const liveGantt: GanttEntry[] = gantt.map(e => ({ ...e }));
  if (openBlock && t + 1 > openBlock.start) {
    liveGantt.push({
      pid:   openBlock.pid,
      label: openBlock.pid === null
        ? 'Idle'
        : (ctx.allProcesses.find(p => p.pid === openBlock.pid)?.name ?? `P${openBlock.pid}`),
      start: openBlock.start,
      end:   t + 1,
    });
  }

  return {
    time:         t,
    running:      running ? clonePCB(running) : null,
    readyQueue:   ctx.readyQueue.map(clonePCB),
    waitingQueue: ctx.waitingQueue.map(clonePCB),
    gantt:        liveGantt,
  };
}

// ─────────────────────────────────────────────
// Main simulation engine
// ─────────────────────────────────────────────

/**
 * Run a complete simulation and return a full timeline of snapshots plus the
 * final Gantt chart and aggregate metrics.
 *
 * @param inputProcesses  Processes in NEW state (not mutated — cloned internally).
 * @param scheduler       The scheduling algorithm to use.
 * @param config          Simulation configuration knobs.
 */
export function runSimulation(
  inputProcesses: PCB[],
  scheduler: Scheduler,
  config: SimConfig
): SimResult {
  // ── Edge case: empty process list ───────────────────────────
  if (inputProcesses.length === 0) {
    return { snapshots: [], gantt: [], processes: [], metrics: emptyMetrics() };
  }

  // Work on deep clones so the caller's data is never mutated
  const processes = inputProcesses.map(clonePCB);

  const snapshots: SimSnapshot[] = [];
  const gantt:     GanttEntry[]  = [];

  const ctx: SimContext = {
    currentTime:  0,
    readyQueue:   [],   // managed by the scheduler (onArrival / pickNext)
    waitingQueue: [],   // managed by the simulator (I/O countdown)
    config,
    allProcesses: processes,
  };

  let running:         PCB | null = null;
  let pendingProcess:  PCB | null = null; // selected but waiting for CS overhead
  let csCountdown    = 0;                 // remaining context-switch idle ticks
  let contextSwitches = 0;
  let busyTicks       = 0;

  // Gantt block tracking ─────────────────────────────────────
  // "open block" = the block currently being written to (not yet closed)
  let openBlock: { pid: number | null; start: number } | null = null;

  /** Close the open block at `endTime` and push it to `gantt`. */
  const closeBlock = (endTime: number): void => {
    if (!openBlock || endTime <= openBlock.start) return;
    // Merge with the last closed block if same pid and contiguous
    const last = gantt[gantt.length - 1];
    if (last && last.pid === openBlock.pid && last.end === openBlock.start) {
      last.end = endTime;
    } else {
      gantt.push({
        pid:   openBlock.pid,
        label: openBlock.pid === null
          ? 'Idle'
          : (processes.find(p => p.pid === openBlock!.pid)?.name ?? `P${openBlock!.pid}`),
        start: openBlock.start,
        end:   endTime,
      });
    }
    openBlock = null;
  };

  /**
   * Open (or continue) a Gantt block for `pid` starting at `time`.
   * If the pid differs from the current open block, the current block is closed first.
   */
  const openBlockFor = (pid: number | null, time: number): void => {
    if (openBlock?.pid === pid) return; // same block continues
    closeBlock(time);
    openBlock = { pid, start: time };
  };

  // ── Loop bounds ─────────────────────────────────────────────
  const allDone = (): boolean =>
    processes.every(p => p.state === ProcessState.TERMINATED);

  const totalBurst = processes.reduce((s, p) => s + p.burstTime, 0);
  const totalIO    = processes.reduce((s, p) => s + (p.ioBursts?.reduce((is, b) => is + b.duration, 0) ?? 0), 0);
  const maxArrival = Math.max(...processes.map(p => p.arrivalTime));
  const maxTime    = maxArrival + totalBurst + totalIO +
                     processes.length * (config.contextSwitchCost + 2) + 200;

  // ── Main tick loop ──────────────────────────────────────────
  let t = 0;
  while (!allDone() && t < maxTime) {
    ctx.currentTime = t;

    // ── 1. Admit arrivals (NEW → READY) ──────────────────────
    for (const p of processes) {
      if (p.state === ProcessState.NEW && p.arrivalTime <= t) {
        transition(p, ProcessState.READY);
        scheduler.onArrival(p, ctx);
      }
    }

    // ── 2. Update I/O queue (WAITING → READY) ────────────────
    for (let i = ctx.waitingQueue.length - 1; i >= 0; i--) {
      ctx.waitingQueue[i].ioCountdown--;
      if (ctx.waitingQueue[i].ioCountdown <= 0) {
        const p = ctx.waitingQueue.splice(i, 1)[0];
        transition(p, ProcessState.READY);
        scheduler.onArrival(p, ctx);
      }
    }

    // ── Context-switch overhead (idle ticks) ──────────────────
    if (csCountdown > 0) {
      csCountdown--;
      openBlockFor(null, t);                                // idle during CS overhead
      snapshots.push(makeSnapshot(t, null, ctx, gantt, openBlock));
      t++;
      continue;
    }

    // After countdown expires, dispatch the pending process
    if (pendingProcess !== null) {
      transition(pendingProcess, ProcessState.RUNNING);
      if (pendingProcess.startTime === null) pendingProcess.startTime = t;
      running        = pendingProcess;
      pendingProcess = null;
      openBlockFor(running.pid, t);
    }

    // ── 3. Check preemption ───────────────────────────────────
    if (running !== null && scheduler.shouldPreempt(running, ctx)) {
      transition(running, ProcessState.READY);
      scheduler.onArrival(running, ctx);
      running = null;
      // Note: context switch cost is applied at step 4 (dispatch), not here
    }

    // ── 4. Dispatch (if CPU idle) ─────────────────────────────
    if (running === null && pendingProcess === null) {
      const next = scheduler.pickNext(ctx);
      if (next !== null) {
        contextSwitches++;
        if (config.contextSwitchCost > 0) {
          // Queue the process; insert idle ticks first (current tick is tick 1 of overhead)
          pendingProcess = next;
          csCountdown    = config.contextSwitchCost - 1;
          openBlockFor(null, t);
          snapshots.push(makeSnapshot(t, null, ctx, gantt, openBlock));
          t++;
          continue;
        }
        transition(next, ProcessState.RUNNING);
        if (next.startTime === null) next.startTime = t;
        running = next;
      }
    }

    // Update Gantt for this tick
    openBlockFor(running?.pid ?? null, t);

    // ── onTick hook (aging, quantum countdown) ─────────────────
    ctx.running = running;
    if (scheduler.onTick) scheduler.onTick(ctx);

    // ── 5. Execute 1 tick ─────────────────────────────────────
    if (running !== null) {
      running.remainingTime--;
      running.cpuTicksDone++;
      busyTicks++;
    }

    // Record snapshot for this tick
    snapshots.push(makeSnapshot(t, running ? clonePCB(running) : null, ctx, gantt, openBlock));

    // ── 6. Handle completion / I/O burst ──────────────────────
    if (running !== null) {
      // Check whether an I/O burst starts at this cpuTicksDone
      const io = running.ioBursts && running.currentIOIndex < running.ioBursts.length
        ? running.ioBursts[running.currentIOIndex]
        : null;

      if (io && io.afterCpu === running.cpuTicksDone) {
        running.ioCountdown = io.duration;
        running.currentIOIndex++;
        transition(running, ProcessState.WAITING);
        ctx.waitingQueue.push(running);
        closeBlock(t + 1);
        running = null;
      } else if (running.remainingTime === 0) {
        running.completionTime = t + 1;
        transition(running, ProcessState.TERMINATED);
        closeBlock(t + 1);
        running = null;
      }
    }

    t++;
  }

  // Close any still-open Gantt block
  closeBlock(t);

  // ── Compute metrics via metrics.ts ───────────────────────
  const totalTime = t; // first tick NOT executed = simulation end time
  const metrics = computeAggregateMetrics(processes, busyTicks, totalTime, contextSwitches);

  return { snapshots, gantt, processes, metrics };
}
