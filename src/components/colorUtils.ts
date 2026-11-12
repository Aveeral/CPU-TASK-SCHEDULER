// ============================================================
// colorUtils.ts — Visualization colors and textbook presets
// ============================================================

import { ProcessInput } from './ProcessForm';

const PROCESS_COLORS = [
  '#2563eb', // blue
  '#059669', // green
  '#d97706', // amber
  '#7c3aed', // purple
  '#db2777', // pink
  '#0891b2', // cyan
  '#ea580c', // orange
  '#4f46e5', // indigo
  '#dc2626', // red
  '#0d9488', // teal
];

export function getProcessColor(pid: number | null): string {
  if (pid === null) return '#94a3b8'; // slate gray for CPU Idle
  const idx = Math.abs(pid - 1) % PROCESS_COLORS.length;
  return PROCESS_COLORS[idx];
}

export interface SamplePreset {
  name: string;
  description: string;
  defaultAlgorithm: string;
  defaultQuantum?: number;
  processes: ProcessInput[];
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    name: 'TC-1: FCFS Basic (3 processes)',
    description: 'P1 monopolizes CPU for 24 ticks (convoy effect demonstration)',
    defaultAlgorithm: 'FCFS',
    processes: [
      { pid: 1, name: 'P1', arrivalTime: 0, burstTime: 24, priority: 0 },
      { pid: 2, name: 'P2', arrivalTime: 1, burstTime: 3,  priority: 0 },
      { pid: 3, name: 'P3', arrivalTime: 2, burstTime: 3,  priority: 0 },
    ],
  },
  {
    name: 'TC-2: CPU Idle Gap (2 processes)',
    description: 'P1 arrives at 0, P2 arrives at 5, demonstrating idle gap handling',
    defaultAlgorithm: 'FCFS',
    processes: [
      { pid: 1, name: 'P1', arrivalTime: 0, burstTime: 2, priority: 0 },
      { pid: 2, name: 'P2', arrivalTime: 5, burstTime: 3, priority: 0 },
    ],
  },
  {
    name: 'TC-3 & TC-4: SJF / SRTF Textbook',
    description: 'Standard textbook comparison between non-preemptive SJF and preemptive SRTF',
    defaultAlgorithm: 'SRTF',
    processes: [
      { pid: 1, name: 'P1', arrivalTime: 0, burstTime: 7, priority: 0 },
      { pid: 2, name: 'P2', arrivalTime: 2, burstTime: 4, priority: 0 },
      { pid: 3, name: 'P3', arrivalTime: 4, burstTime: 1, priority: 0 },
      { pid: 4, name: 'P4', arrivalTime: 5, burstTime: 4, priority: 0 },
    ],
  },
  {
    name: 'TC-5: Round Robin (Quantum = 4)',
    description: 'Interleaving processes with bursts 10, 6, 2',
    defaultAlgorithm: 'Round Robin',
    defaultQuantum: 4,
    processes: [
      { pid: 1, name: 'P1', arrivalTime: 0, burstTime: 10, priority: 0 },
      { pid: 2, name: 'P2', arrivalTime: 0, burstTime: 6,  priority: 0 },
      { pid: 3, name: 'P3', arrivalTime: 0, burstTime: 2,  priority: 0 },
    ],
  },
  {
    name: 'TC-6: Priority Scheduling (5 processes)',
    description: 'Textbook priority example with priorities 1 to 5',
    defaultAlgorithm: 'Priority (Non-Preemptive)',
    processes: [
      { pid: 1, name: 'P1', arrivalTime: 0, burstTime: 10, priority: 3 },
      { pid: 2, name: 'P2', arrivalTime: 0, burstTime: 1,  priority: 1 },
      { pid: 3, name: 'P3', arrivalTime: 0, burstTime: 2,  priority: 4 },
      { pid: 4, name: 'P4', arrivalTime: 0, burstTime: 1,  priority: 5 },
      { pid: 5, name: 'P5', arrivalTime: 0, burstTime: 5,  priority: 2 },
    ],
  },
  {
    name: 'MLFQ Demonstration (3 processes)',
    description: 'Demonstrating queue demotion across 3 levels (q=4, q=8, FCFS)',
    defaultAlgorithm: 'MLFQ',
    processes: [
      { pid: 1, name: 'P1', arrivalTime: 0, burstTime: 14, priority: 0 },
      { pid: 2, name: 'P2', arrivalTime: 0, burstTime: 4,  priority: 0 },
      { pid: 3, name: 'P3', arrivalTime: 6, burstTime: 2,  priority: 0 },
    ],
  },
];
