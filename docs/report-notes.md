# Viva & Course Report Notes: Operating Systems CPU Scheduling

This document contains detailed theoretical explanations, mathematical justifications, and answers to common viva/oral examination questions for this project.

---

## 1. Why SJF and SRTF Are Optimal for Average Waiting Time

### The Theoretical Justification
Shortest Job First (SJF) and Shortest Remaining Time First (SRTF) are **provably optimal** algorithms for minimizing the average waiting time ($\bar{W}$) of a set of processes on a single CPU.

**Mathematical Proof (Exchange Argument):**
Suppose processes are scheduled in order:
$$P_1, P_2, \dots, P_n$$
with execution durations $b_1, b_2, \dots, b_n$.
The total waiting time $W_{total}$ is:
$$W_{total} = 0 + b_1 + (b_1 + b_2) + (b_1 + b_2 + b_3) + \dots = \sum_{i=1}^{n} (n - i) b_i$$

Notice that the first process $P_1$ is counted $(n-1)$ times in the waiting times of all subsequent processes; $P_2$ is counted $(n-2)$ times, and $P_n$ is counted $0$ times.
To minimize the sum $\sum (n - i) b_i$, the largest weights $(n - i)$ must be multiplied by the smallest burst times $b_i$.
Therefore, ordering jobs such that $b_1 \le b_2 \le \dots \le b_n$ guarantees minimal total waiting time. Any adjacent pair $(P_i, P_{i+1})$ where $b_i > b_{i+1}$ increases total waiting time if scheduled out of order.

**In Practice (The Big Caveat):**
SJF cannot be implemented directly in general-purpose operating systems because the OS **cannot know future CPU burst times in advance**.
Instead, real-world systems use:
- **Exponential Smoothing:** Predicting future burst $\tau_{n+1} = \alpha t_n + (1 - \alpha) \tau_n$.
- **MLFQ (Multi-Level Feedback Queue):** Using past behavior to infer whether a job is interactive (short burst) or CPU-bound (long burst).

---

## 2. The Convoy Effect (FCFS)

### What it is
The **convoy effect** occurs in non-preemptive FCFS scheduling when a single long, CPU-bound process monopolizes the CPU while multiple shorter, I/O-bound processes queue behind it.

### Concrete Numerical Comparison (from our Simulator TC-1)
Consider 3 processes arriving at $t=0$:
- $P_1$: Burst = 24
- $P_2$: Burst = 3
- $P_3$: Burst = 3

**FCFS Schedule:**
- Gantt: $P_1[0-24] \to P_2[24-27] \to P_3[27-30]$
- Waiting Times: $P_1 = 0$, $P_2 = 23$, $P_3 = 25$
- **Average Waiting Time = 16.0 ticks**

**SJF / SRTF Schedule:**
- Gantt: $P_2[0-3] \to P_3[3-6] \to P_1[6-30]$
- Waiting Times: $P_2 = 0$, $P_3 = 3$, $P_1 = 6$
- **Average Waiting Time = 3.0 ticks**

### System-Wide Impact
During the convoy effect:
1. Short processes that only need a brief CPU burst before initiating disk or network I/O are stalled in the ready queue.
2. The I/O devices sit idle while the CPU-bound job runs.
3. When the long CPU job finally yields, all the short jobs rush to the I/O devices, leaving the CPU underutilized.
4. Result: degraded device utilization and poor user interactivity.

---

## 3. The Quantum Trade-Off in Round Robin

Round Robin relies on a single tuning parameter: the **time quantum** ($q$).

### The Two Extremes
1. **$q \to \infty$ (Very Large Quantum):**
   - If $q > \max(B_i)$, no process ever exhausts its quantum.
   - The scheduler degrades to **FCFS**.
   - Average turnaround time suffers if long jobs arrive first.
2. **$q \to 0$ (Very Small Quantum - Processor Sharing):**
   - Each process gets $1/n$-th of the CPU speed.
   - Response time approaches near-zero.
   - **However:** Each context switch costs CPU cycles (saving registers, cache invalidation, pipeline flushes). If $q$ is comparable to the context-switch time, the CPU spends most of its cycles switching contexts rather than executing productive instructions.

### The Rule of Thumb
In production systems, $q$ is configured so that **approximately 80% of CPU bursts are shorter than $q$**.
This ensures that short interactive jobs complete within a single time slice without preemption, while long compute-bound jobs are fairly time-sliced without excessive overhead.

---

## 4. Starvation and Priority Aging

### The Starvation Problem (Indefinite Postponement)
In strict priority scheduling and SJF, low-priority (or long) jobs can starve if higher-priority (or shorter) jobs continuously enter the system.
The low-priority job sits in the ready queue indefinitely, never getting dispatched.

### The Solution: Aging
**Aging** gradually increases the priority of waiting processes as time passes.
- In our simulator: Every `agingInterval` ticks (e.g. 10 ticks), the priority of all processes waiting in the ready queue is improved.
- Eventually, even the lowest-priority process becomes the highest-priority process in the queue, guaranteeing that it receives CPU time.
- This bounds the maximum waiting time and prevents starvation.

---

## 5. What a Context Switch Costs

When the CPU switches execution from Process $A$ to Process $B$, several hardware and OS overheads occur:

1. **State Preservation:** Saving CPU registers, stack pointer, program counter ($PC$), and condition flags into $A$'s PCB.
2. **Kernel Dispatch:** Selecting $B$ from the ready queue and updating process accounting metrics.
3. **State Restoration:** Loading $B$'s saved registers, $PC$, and page table base register ($CR3$ on x86).
4. **Cache & TLB Pollution (Cold Caches):** The Translation Lookaside Buffer (TLB) may need to be invalidated, and hardware CPU caches ($L1/L2/L3$) no longer contain $B$'s memory lines, leading to an initial burst of cache misses.

In our simulator, the `contextSwitchCost` configuration inserts explicit idle overhead ticks upon each dispatch, enabling direct observation of how context-switching reduces overall CPU utilization and throughput.

---

## 6. Multi-Level Feedback Queue (MLFQ) Design Rationale

MLFQ is the scheduling architecture used by most modern general-purpose operating systems (Linux CFS uses virtual runtime principles; Windows and macOS use multi-level priority bands).

### Core Goals of MLFQ
1. **Optimize Turnaround Time:** Favor short jobs (approximating SJF) without requiring advance knowledge of burst times.
2. **Optimize Response Time:** Provide rapid response times for interactive applications (e.g. keyboard/mouse input).
3. **Prevent Starvation:** Ensure long CPU-bound jobs eventually make forward progress.

### The 5 OSTEP Rules Implemented in our Simulator
1. **Rule 1:** If $\text{Priority}(A) > \text{Priority}(B)$, $A$ runs and $B$ does not.
2. **Rule 2:** If $\text{Priority}(A) == \text{Priority}(B)$, $A$ and $B$ run in Round Robin using the queue's quantum.
3. **Rule 3:** When a process enters the system, it is placed at the highest priority (Level 0).
4. **Rule 4:** Once a process uses up its time allotment at a given level (e.g. 4 ticks at Level 0, 8 ticks at Level 1), its priority is reduced (demoted by one queue).
5. **Rule 5:** After some time period $S$ (the Priority Boost interval), move all processes in the system to the topmost queue.
