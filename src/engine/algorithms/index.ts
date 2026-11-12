// ============================================================
// algorithms/index.ts — Scheduler registry
// Maps algorithm names to their Scheduler implementations.
// Import from here when you need to look up an algorithm by name.
// ============================================================

import { Scheduler } from '../types';
import { fcfsScheduler } from './fcfs';
import { sjfScheduler } from './sjf';
import { srtfScheduler } from './srtf';
import {
  priorityScheduler,
  priorityNonPreemptiveScheduler,
  priorityPreemptiveScheduler,
  createPriorityScheduler,
} from './priority';
import {
  roundRobinScheduler,
  createRoundRobinScheduler,
} from './roundRobin';
import {
  mlfqScheduler,
  createMLFQScheduler,
} from './mlfq';

export const schedulerRegistry: Record<string, Scheduler> = {
  FCFS: fcfsScheduler,
  SJF: sjfScheduler,
  'SJF (NON-PREEMPTIVE)': sjfScheduler,
  SRTF: srtfScheduler,
  'SRTF (PREEMPTIVE SJF)': srtfScheduler,
  PRIORITY: priorityScheduler,
  'PRIORITY (NON-PREEMPTIVE)': priorityNonPreemptiveScheduler,
  'PRIORITY (PREEMPTIVE)': priorityPreemptiveScheduler,
  PRIORITY_NP: priorityNonPreemptiveScheduler,
  PRIORITY_PREEMPTIVE: priorityPreemptiveScheduler,
  RR: roundRobinScheduler,
  'ROUND ROBIN': roundRobinScheduler,
  ROUNDROBIN: roundRobinScheduler,
  MLFQ: mlfqScheduler,
  'MULTI-LEVEL FEEDBACK QUEUE': mlfqScheduler,
};

/**
 * Look up a scheduler by name (case-insensitive).
 * Throws if the algorithm is not registered.
 */
export function getScheduler(name: string): Scheduler {
  const key = name.trim().toUpperCase();
  const s   = schedulerRegistry[key];
  if (!s) {
    throw new Error(
      `Unknown scheduling algorithm: "${name}". ` +
      `Available: ${Object.keys(schedulerRegistry).join(', ')}`
    );
  }
  return s;
}

export {
  fcfsScheduler,
  sjfScheduler,
  srtfScheduler,
  priorityScheduler,
  priorityNonPreemptiveScheduler,
  priorityPreemptiveScheduler,
  createPriorityScheduler,
  roundRobinScheduler,
  createRoundRobinScheduler,
  mlfqScheduler,
  createMLFQScheduler,
};
