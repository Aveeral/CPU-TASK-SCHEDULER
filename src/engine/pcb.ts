// ============================================================
// pcb.ts — PCB factory and validated state transitions
// NO React imports — pure TypeScript engine code only.
// ============================================================

import { PCB, ProcessState, IOBurst } from './types';

/** Legal state transitions as an adjacency map. */
const LEGAL_TRANSITIONS: Record<ProcessState, ProcessState[]> = {
  [ProcessState.NEW]:        [ProcessState.READY],
  [ProcessState.READY]:      [ProcessState.RUNNING],
  [ProcessState.RUNNING]:    [ProcessState.READY, ProcessState.WAITING, ProcessState.TERMINATED],
  [ProcessState.WAITING]:    [ProcessState.READY],
  [ProcessState.TERMINATED]: [],   // terminal state — no outgoing transitions
};

/**
 * Transition a PCB from its current state to `next`.
 * Throws an Error if the transition is illegal, so bugs surface immediately.
 *
 * @param pcb   The process control block to mutate.
 * @param next  The target state.
 */
export function transition(pcb: PCB, next: ProcessState): void {
  const allowed = LEGAL_TRANSITIONS[pcb.state];
  if (!allowed.includes(next)) {
    throw new Error(
      `Illegal state transition for ${pcb.name} (PID ${pcb.pid}): ` +
      `${pcb.state} → ${next}`
    );
  }
  pcb.state = next;
}

/** Parameters accepted by createPCB. */
export interface CreatePCBOptions {
  pid:          number;
  name:         string;
  arrivalTime:  number;
  burstTime:    number;
  priority?:    number;    // defaults to 0
  ioBursts?:    IOBurst[];
}

/**
 * Factory function: creates a PCB in the NEW state with all runtime fields
 * initialised to their zero / null defaults.
 *
 * Validates inputs and throws for negative or zero burst times.
 */
export function createPCB(opts: CreatePCBOptions): PCB {
  if (opts.burstTime <= 0) {
    throw new Error(
      `Invalid burstTime ${opts.burstTime} for process "${opts.name}" (PID ${opts.pid}). ` +
      `Burst time must be a positive integer.`
    );
  }
  if (opts.arrivalTime < 0) {
    throw new Error(
      `Invalid arrivalTime ${opts.arrivalTime} for process "${opts.name}" (PID ${opts.pid}). ` +
      `Arrival time cannot be negative.`
    );
  }

  return {
    pid:            opts.pid,
    name:           opts.name,
    arrivalTime:    opts.arrivalTime,
    burstTime:      opts.burstTime,
    priority:       opts.priority ?? 0,
    remainingTime:  opts.burstTime,
    state:          ProcessState.NEW,
    cpuTicksDone:   0,
    ioCountdown:    0,
    currentIOIndex: 0,
    startTime:      null,
    completionTime: null,
    waitingTime:    null,
    turnaroundTime: null,
    responseTime:   null,
    ioBursts:       opts.ioBursts,
  };
}

/**
 * Returns a deep clone of a PCB so the simulator can safely snapshot state
 * without mutating the original.
 */
export function clonePCB(pcb: PCB): PCB {
  return {
    ...pcb,
    ioBursts: pcb.ioBursts ? pcb.ioBursts.map(b => ({ ...b })) : undefined,
  };
}

/**
 * Returns a human-readable summary of a PCB (useful for debugging).
 */
export function describePCB(pcb: PCB): string {
  return (
    `[PID ${pcb.pid} | ${pcb.name} | state=${pcb.state} | ` +
    `remaining=${pcb.remainingTime}/${pcb.burstTime} | arr=${pcb.arrivalTime}]`
  );
}
