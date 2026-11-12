// ============================================================
// types.ts — Core data model for the CPU Scheduling Simulator
// NO React imports — pure TypeScript engine types only.
// ============================================================

/** The five process states from OS theory. */
export enum ProcessState {
  NEW        = 'NEW',
  READY      = 'READY',
  RUNNING    = 'RUNNING',
  WAITING    = 'WAITING',      // blocked on I/O
  TERMINATED = 'TERMINATED',
}

/**
 * An I/O burst that occurs after a certain number of CPU ticks.
 * e.g. { afterCpu: 3, duration: 2 } means after 3 CPU ticks, do 2 ticks of I/O.
 */
export interface IOBurst {
  afterCpu: number;   // how many CPU ticks have been consumed before this I/O starts
  duration: number;   // how many ticks the I/O lasts
}

/** Process Control Block — mirrors the PCB concept from OS theory. */
export interface PCB {
  pid: number;
  name: string;

  // Scheduling parameters (set at creation, never mutated)
  arrivalTime:   number;
  burstTime:     number;    // total CPU burst needed
  priority:      number;    // lower number = higher priority (configurable)

  // Runtime state (mutated during simulation)
  remainingTime: number;    // counts down from burstTime
  state:         ProcessState;
  cpuTicksDone:  number;    // CPU ticks completed so far (used for I/O tracking)
  ioCountdown:   number;    // ticks remaining in current I/O burst (0 = not in I/O)
  currentIOIndex:number;    // which IOBurst entry we're on

  // Timestamps (null until the event occurs)
  startTime:       number | null;   // first tick the process gets the CPU
  completionTime:  number | null;

  // Computed metrics (filled after completion)
  waitingTime:     number | null;
  turnaroundTime:  number | null;
  responseTime:    number | null;

  // Optional I/O bursts
  ioBursts?: IOBurst[];
}

/** One colored block on the Gantt chart. pid === null means CPU is idle. */
export interface GanttEntry {
  pid:   number | null;
  label: string;           // e.g. "P1" or "Idle"
  start: number;
  end:   number;
}

/** Full system snapshot at a single point in time (for step-through UI). */
export interface SimSnapshot {
  time:         number;
  running:      PCB | null;
  readyQueue:   PCB[];
  waitingQueue: PCB[];
  gantt:        GanttEntry[];  // cumulative Gantt up to this tick
}

/** Per-run aggregate statistics. */
export interface AggregateMetrics {
  avgWaitingTime:     number;
  avgTurnaroundTime:  number;
  avgResponseTime:    number;
  cpuUtilization:     number;   // 0–100 (%)
  throughput:         number;   // processes / total time
  contextSwitches:    number;
  totalTime:          number;
}

/** Configuration knobs for a simulation run. */
export interface SimConfig {
  algorithm:          string;
  timeQuantum:        number;   // used by RR and MLFQ (ignored by others)
  contextSwitchCost:  number;   // idle ticks inserted on every context switch
  higherPriorityFirst: boolean; // true = lower number wins (default OS convention)
  agingEnabled:       boolean;  // for priority scheduler
  agingInterval:      number;   // ticks between priority increments when aging
}

/** Everything the scheduler sees each tick. */
export interface SimContext {
  currentTime:  number;
  readyQueue:   PCB[];          // processes ready to run (scheduler may reorder)
  waitingQueue: PCB[];          // processes blocked on I/O
  config:       SimConfig;
  allProcesses: PCB[];          // full list (read-only reference)
  running?:     PCB | null;     // currently dispatched process (if any)
}

/**
 * Every scheduling algorithm implements this interface.
 * Adding a new algorithm = creating one object that satisfies this shape.
 */
export interface Scheduler {
  name:       string;
  preemptive: boolean;

  /** Called once per arriving process (NEW → READY). Insert into readyQueue. */
  onArrival(p: PCB, ctx: SimContext): void;

  /** Return the next process to run, or null if the queue is empty. */
  pickNext(ctx: SimContext): PCB | null;

  /** Return true if the currently running process should be preempted this tick. */
  shouldPreempt(running: PCB, ctx: SimContext): boolean;

  /** Optional per-tick hook — aging, quantum countdown, etc. */
  onTick?(ctx: SimContext): void;
}

/** The final result of a complete simulation run. */
export interface SimResult {
  snapshots: SimSnapshot[];
  gantt:     GanttEntry[];
  processes: PCB[];            // final state with all metrics populated
  metrics:   AggregateMetrics;
}
