// ============================================================
// metrics.ts — Per-process and aggregate metric computation
// NO React imports — pure TypeScript engine code only.
//
// Formulas (from design.md):
//   TAT = completionTime  − arrivalTime
//   WT  = TAT            − burstTime
//   RT  = startTime      − arrivalTime
//   CPU Utilization = (busyTicks / totalTime) × 100 %
//   Throughput      = completedCount / totalTime
// ============================================================

import { PCB, AggregateMetrics } from './types';

// ─────────────────────────────────────────────
// Per-process metrics
// ─────────────────────────────────────────────

/**
 * Compute TAT, WT, and RT for a single completed process and
 * write them back into the PCB.
 *
 * Safe to call on incomplete processes — it only writes when
 * both `completionTime` and `startTime` are non-null.
 */
export function computeProcessMetrics(p: PCB): void {
  if (p.completionTime === null || p.startTime === null) return;

  p.turnaroundTime = p.completionTime - p.arrivalTime;
  p.waitingTime    = p.turnaroundTime - p.burstTime;
  p.responseTime   = p.startTime      - p.arrivalTime;
}

// ─────────────────────────────────────────────
// Aggregate metrics
// ─────────────────────────────────────────────

/**
 * Compute aggregate statistics from a finished simulation.
 *
 * Also calls `computeProcessMetrics` on every process so callers
 * don't need to do it separately.
 *
 * @param processes       All PCBs after the simulation loop.
 * @param busyTicks       Ticks the CPU was actually executing a process.
 * @param totalTime       Total elapsed simulation time (first tick the CPU is free after last process).
 * @param contextSwitches Number of times the CPU dispatched a new process.
 */
export function computeAggregateMetrics(
  processes: PCB[],
  busyTicks: number,
  totalTime: number,
  contextSwitches: number
): AggregateMetrics {
  // Fill in per-process metrics first
  for (const p of processes) {
    computeProcessMetrics(p);
  }

  const done = processes.filter(p => p.completionTime !== null);
  const n    = done.length;

  const avg = (key: keyof PCB): number =>
    n === 0 ? 0 : done.reduce((sum, p) => sum + ((p[key] as number) ?? 0), 0) / n;

  return {
    avgWaitingTime:    avg('waitingTime'),
    avgTurnaroundTime: avg('turnaroundTime'),
    avgResponseTime:   avg('responseTime'),
    cpuUtilization:    totalTime > 0 ? (busyTicks / totalTime) * 100 : 0,
    throughput:        totalTime > 0 ? done.length / totalTime : 0,
    contextSwitches,
    totalTime,
  };
}

// ─────────────────────────────────────────────
// Formatting helpers (used by UI / reports)
// ─────────────────────────────────────────────

/** Round a number to `dp` decimal places. */
export function round(value: number, dp = 2): number {
  return Math.round(value * 10 ** dp) / 10 ** dp;
}

/** Format metrics as a human-readable string (for debugging / CLI). */
export function formatMetrics(m: AggregateMetrics): string {
  return [
    `Avg WT:    ${round(m.avgWaitingTime)}`,
    `Avg TAT:   ${round(m.avgTurnaroundTime)}`,
    `Avg RT:    ${round(m.avgResponseTime)}`,
    `CPU util:  ${round(m.cpuUtilization)}%`,
    `Throughput:${round(m.throughput, 4)} proc/unit`,
    `CS count:  ${m.contextSwitches}`,
    `Total time:${m.totalTime}`,
  ].join('\n');
}

/** Format a single process's metrics as a table row string. */
export function formatProcessMetrics(p: PCB): string {
  return (
    `PID=${p.pid} name=${p.name} ` +
    `arr=${p.arrivalTime} burst=${p.burstTime} ` +
    `start=${p.startTime ?? '-'} done=${p.completionTime ?? '-'} ` +
    `TAT=${p.turnaroundTime ?? '-'} WT=${p.waitingTime ?? '-'} RT=${p.responseTime ?? '-'}`
  );
}
