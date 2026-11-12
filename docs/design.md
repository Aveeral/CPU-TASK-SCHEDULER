# Design Document — Single-Core CPU Scheduling Simulator

## 1. Process States

A process moves through these five states exactly as defined by OS theory:

```
NEW → READY → RUNNING → TERMINATED
              ↑  ↓            ↑
           WAITING ──────────┘   (after I/O)
```

### Legal State Transitions

| From      | To          | Trigger                                 |
|-----------|-------------|-----------------------------------------|
| NEW       | READY       | Process admitted / arrives              |
| READY     | RUNNING     | Dispatcher selects the process          |
| RUNNING   | READY       | Preempted by scheduler                  |
| RUNNING   | WAITING     | Process issues I/O request              |
| RUNNING   | TERMINATED  | Burst complete                          |
| WAITING   | READY       | I/O completes                           |

**All other transitions are illegal and throw at runtime.**

---

## 2. Process Control Block (PCB)

```ts
interface PCB {
  pid: number;
  name: string;
  arrivalTime: number;
  burstTime: number;       // original total CPU burst
  remainingTime: number;   // counts down during execution
  priority: number;        // lower number = higher priority (configurable)
  state: ProcessState;
  startTime: number | null;       // first time CPU is assigned
  completionTime: number | null;
  waitingTime: number | null;
  turnaroundTime: number | null;
  responseTime: number | null;
  ioBursts?: Array<{ afterCpu: number; duration: number }>;
}
```

---

## 3. Scheduler Interface

Every scheduling algorithm implements this interface, making it trivial to add new ones:

```ts
interface Scheduler {
  name: string;
  preemptive: boolean;
  onArrival(p: PCB, ctx: SimContext): void;      // called when a process enters READY
  pickNext(ctx: SimContext): PCB | null;          // choose the next process to run
  shouldPreempt(running: PCB, ctx: SimContext): boolean; // return true to preempt
  onTick?(ctx: SimContext): void;                 // optional: aging, quantum countdown
}
```

---

## 4. Simulator Tick Order

The simulation is **tick-driven** (1 tick = 1 time unit). Each tick executes in this exact order:

1. **Admit arrivals** — promote NEW processes whose `arrivalTime ≤ currentTime` to READY. Call `scheduler.onArrival()` for each.
2. **Update I/O queue** — decrement I/O counters; promote WAITING → READY when done.
3. **Check preemption** — call `scheduler.shouldPreempt(running, ctx)` if a process is running.
4. **Dispatch** — if CPU is idle, call `scheduler.pickNext(ctx)`. Apply context-switch overhead (idle ticks) if configured.
5. **Execute** — decrement `remainingTime` of the running process by 1.
6. **Handle completion / burst end** — if `remainingTime === 0`, mark TERMINATED and compute metrics. If I/O burst is next, transition to WAITING.
7. **Record Gantt entry + snapshot** — push current state into the timeline for UI step-through.

---

## 5. Algorithms

| Algorithm | Preemptive | Key Rule                                              |
|-----------|------------|-------------------------------------------------------|
| FCFS      | No         | Arrival order; ties broken by PID                     |
| SJF       | No         | Shortest burst; ties → arrival time, then PID         |
| SRTF      | Yes        | Shortest remaining time; preempts on new arrival      |
| Priority  | Both       | Lower number = higher priority; ties → arrival, PID  |
| Round Robin | Yes      | Fixed quantum; expired quantum → back of queue        |
| MLFQ      | Yes        | 3 queues (RR q=4, RR q=8, FCFS); demotion + boost    |

### Tie-breaking Rule (applies to all algorithms)
When two processes are equal on the primary key (burst, priority, etc.):
1. Break by **arrival time** (earlier first)
2. Then by **PID** (lower first)

---

## 6. Metrics Formulas

- **TAT** = `completionTime − arrivalTime`
- **WT** = `TAT − burstTime`
- **RT** = `startTime − arrivalTime`
- **CPU Utilization** = `(total busy ticks / total simulation ticks) × 100%`
- **Throughput** = `processCount / totalSimulationTime`
- **Context-switch count** = number of times a different process is dispatched

---

## 7. Output Structures

```ts
interface GanttEntry {
  pid: number | null;   // null = CPU idle
  start: number;
  end: number;
}

interface SimSnapshot {
  time: number;
  running: PCB | null;
  readyQueue: PCB[];
  waitingQueue: PCB[];
  gantt: GanttEntry[];
}

interface SimResult {
  snapshots: SimSnapshot[];
  gantt: GanttEntry[];
  processes: PCB[];         // final state with all metrics filled
  metrics: AggregateMetrics;
}
```
