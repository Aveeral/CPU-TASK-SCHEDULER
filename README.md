# Task Scheduler: Single-Core CPU Scheduling Simulator

> **Operating Systems Course Project**  
> A pure TypeScript simulation engine and interactive visualizer for fundamental OS CPU scheduling algorithms.

---

## 🚀 Overview

This project simulates a single-core CPU scheduler following core Operating System principles. The simulation engine is decoupled from the user interface:
- **Engine (`src/engine/`):** Pure TypeScript with **zero UI dependencies**. It maintains process control blocks (PCBs), models OS state transitions, evaluates scheduling policies tick-by-tick, simulates context switches and I/O bursts, and computes performance metrics.
- **Visualizer (`src/components/`):** An interactive React dashboard providing real-time Ready Queue visualization, CPU execution monitoring, step-by-step playback, Gantt charts, and side-by-side algorithm benchmarking.

---

## 📋 Algorithm Summary Table

| Algorithm | Type | Preemptive? | Primary Scheduling Rule | Tie-Breaking Rule |
| :--- | :--- | :---: | :--- | :--- |
| **FCFS** | Non-Preemptive | ❌ No | Arrival order (FIFO) | Arrival Time $\to$ PID |
| **SJF** | Non-Preemptive | ❌ No | Shortest CPU burst time | Arrival Time $\to$ PID |
| **SRTF** | Preemptive | ✅ Yes | Shortest remaining execution time | Arrival Time $\to$ PID |
| **Round Robin (RR)** | Preemptive | ✅ Yes | Time-slice quantum expiration | FIFO Queue Order |
| **Priority (Non-Preemptive)** | Non-Preemptive | ❌ No | Priority level (configurable direction) | Arrival Time $\to$ PID |
| **Priority (Preemptive)** | Preemptive | ✅ Yes | Preempts when strictly higher priority arrives | Arrival Time $\to$ PID |
| **MLFQ** | Preemptive | ✅ Yes | 3 Queues: L0 ($q=4$) $\to$ L1 ($q=8$) $\to$ L2 (FCFS) | Queue Level $\to$ FIFO |

---

## 📐 OS Metrics & Mathematical Formulas

For each process $P_i$ with arrival time $A_i$, CPU burst $B_i$, first CPU dispatch time $S_i$, and completion time $C_i$:

- **Turnaround Time ($TAT$):**  
  $$TAT_i = C_i - A_i$$
- **Waiting Time ($WT$):**  
  $$WT_i = TAT_i - B_i$$
- **Response Time ($RT$):**  
  $$RT_i = S_i - A_i$$
- **CPU Utilization:**  
  $$\text{Utilization} = \frac{\text{Total Busy Ticks}}{\text{Total Simulation Ticks}} \times 100\%$$
- **Throughput:**  
  $$\text{Throughput} = \frac{\text{Processes Completed}}{\text{Total Elapsed Ticks}}$$

---

## 🛠️ Project Structure

```
task-scheduler/
├── docs/
│   ├── design.md              # OS concepts, state diagram, tick order
│   ├── test-cases.md          # Hand-calculated textbook benchmark cases
│   └── report-notes.md        # Comprehensive viva & exam talking points
├── src/
│   ├── engine/                # Pure TypeScript simulation core (no React)
│   │   ├── types.ts           # PCB, ProcessState, GanttEntry, SimConfig, Metrics
│   │   ├── pcb.ts             # Factory, validation, state transition machine
│   │   ├── readyQueue.ts      # FIFO, Priority Queue, MLFQ Queues & comparators
│   │   ├── simulator.ts       # 7-step tick engine, dispatcher, context-switch logic
│   │   ├── metrics.ts         # Per-process and aggregate metric calculators
│   │   └── algorithms/
│   │       ├── fcfs.ts
│   │       ├── sjf.ts
│   │       ├── srtf.ts
│   │       ├── priority.ts    # Preemptive & non-preemptive + aging
│   │       ├── roundRobin.ts
│   │       ├── mlfq.ts        # 3 levels + demotion + periodic boost
│   │       └── index.ts       # Central algorithm registry
│   ├── components/            # React visualization dashboard
│   │   ├── ProcessForm.tsx    # Add/edit process + 6 sample presets
│   │   ├── ProcessTable.tsx   # Configured process list
│   │   ├── AlgorithmPicker.tsx# Algorithm selector + dynamic quantum field
│   │   ├── GanttChart.tsx     # Color-coded execution timeline + idle blocks
│   │   ├── QueueView.tsx      # Live Ready Queue, Running Process, and I/O Queue
│   │   ├── MetricsPanel.tsx   # KPI cards and per-process results table
│   │   ├── Controls.tsx       # Run All, Step Back/Forward, Play/Pause, Scrubber
│   │   ├── CompareView.tsx    # Multi-algorithm benchmark & bar chart
│   │   └── colorUtils.ts      # Deterministic process color mapping
│   ├── App.tsx                # Main application tab layout
│   └── main.tsx
└── tests/                     # 210 Vitest tests
    ├── sanity.test.ts         # Test runner verification
    ├── phase1.test.ts         # PCB lifecycle & Queue invariants
    ├── fcfs.test.ts           # FCFS textbook verification & idle gaps
    ├── metrics.test.ts        # Mathematical formula verification
    ├── sjf.test.ts            # Shortest Job First non-preemptive
    ├── srtf.test.ts           # Preemptive SJF & Silberschatz benchmark
    ├── priority.test.ts       # Priority (both modes, reverse direction, aging)
    ├── roundRobin.test.ts     # Quantum=1, 2, 4, FCFS equivalence, edge cases
    ├── mlfq.test.ts           # 3-level demotion, boost, overhead, I/O bursts
    ├── ui.test.tsx            # UI component rendering & interaction
    └── edgeCases.test.ts      # 8 edge cases & error handling
```

---

## ⚡ Quick Start & Setup

### 1. Installation
Clone or navigate to the project directory:
```bash
cd "OS Project/task-scheduler"
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open your browser at **`http://localhost:5173`**.

### 3. Run the Unit Test Suite (210 tests)
```bash
npm test
```
To run tests in watch mode:
```bash
npm run test:watch
```

### 4. Build for Production
```bash
npm run build
```

---

## 🎯 Features & Walkthrough

1. **Preloaded Textbook Test Cases:**
   - **TC-1:** FCFS Convoy Effect ($P_1=24, P_2=3, P_3=3$).
   - **TC-2:** CPU Idle Gaps ($P_1$ at 0, $P_2$ at 5).
   - **TC-3 & TC-4:** SJF vs. SRTF comparison on identical arrivals.
   - **TC-5:** Round Robin interleaving ($q=4$).
   - **TC-6:** Priority Scheduling with priorities 1 to 5.
   - **MLFQ:** Demotion across 3 queues ($q=4 \to q=8 \to \text{FCFS}$).

2. **Interactive Playback & Step-Through:**
   - **Play / Pause:** Live animated clock ticks with adjustable playback speed (0.5x to 5x).
   - **Step Forward / Backward:** Inspect the CPU, Ready Queue, and PCB states at any single tick.
   - **Scrubber:** Jump directly to any point in the timeline.

3. **Multi-Algorithm Compare Benchmark:**
   - Runs all 7 algorithms simultaneously on your input workload.
   - Displays comparative bar charts of Average Waiting Time and Average Turnaround Time.
   - Automatically highlights the mathematically optimal policy.

4. **Advanced OS Simulation Features:**
   - **Context-Switch Overhead:** Configurable idle delay ticks inserted on process changes.
   - **Priority Aging:** Configurable interval to boost waiting jobs and prevent starvation.
   - **I/O Bursts:** Processes can transition to `WAITING` state and return to `READY` upon I/O completion.

---

## 🚢 Deployment Guide

### Deploying to GitHub & GitHub Pages / Vercel

#### Step 1: Initialize Git and Push to GitHub
```bash
cd "OS Project/task-scheduler"
git init
git add .
git commit -m "feat: complete CPU scheduling simulator (all 9 phases, 210 tests)"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<REPO_NAME>.git
git push -u origin main
```

#### Step 2: Deploy Free in 1 Click (Vercel)
1. Go to [vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New Project** and select your repository.
3. Keep default settings (`Framework Preset: Vite`, `Build Command: npm run build`, `Output Directory: dist`).
4. Click **Deploy**. Your live project URL will be ready in under 60 seconds!

---

## 📚 Viva / Report Notes
For full theoretical explanations and viva talking points, see [`docs/report-notes.md`](./docs/report-notes.md):
- Why SJF/SRTF are optimal for average waiting time
- The convoy effect and mitigation
- The quantum trade-off in Round Robin
- Starvation and aging solutions
- Context switch costs on real hardware vs. simulation
- Multi-Level Feedback Queue (MLFQ) design principles
