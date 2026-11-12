// ============================================================
// CompareView.tsx — Benchmarks all algorithms side-by-side
// Computes and renders an Avg WT & Avg TAT comparative bar chart.
// ============================================================

import React, { useMemo } from 'react';
import { ProcessInput } from './ProcessForm';
import { createPCB } from '../engine/pcb';
import { runSimulation, defaultConfig } from '../engine/simulator';
import { getScheduler } from '../engine/algorithms';
import { round } from '../engine/metrics';
import { AggregateMetrics } from '../engine/types';

interface CompareViewProps {
  processes: ProcessInput[];
}

interface AlgorithmBenchmark {
  id: string;
  name: string;
  preemptive: boolean;
  metrics: AggregateMetrics;
}

const ALGORITHMS_TO_COMPARE = [
  { id: 'FCFS',                       name: 'FCFS',                       lookup: 'FCFS' },
  { id: 'SJF',                        name: 'SJF (Non-Preemptive)',       lookup: 'SJF' },
  { id: 'SRTF',                       name: 'SRTF (Preemptive SJF)',      lookup: 'SRTF' },
  { id: 'Round Robin',                name: 'Round Robin (q=4)',          lookup: 'Round Robin' },
  { id: 'Priority (Non-Preemptive)',  name: 'Priority (Non-Preemptive)',  lookup: 'Priority (Non-Preemptive)' },
  { id: 'Priority (Preemptive)',      name: 'Priority (Preemptive)',      lookup: 'Priority (Preemptive)' },
  { id: 'MLFQ',                       name: 'MLFQ (3 Queues)',            lookup: 'MLFQ' },
];

export const CompareView: React.FC<CompareViewProps> = ({ processes }) => {
  const benchmarks: AlgorithmBenchmark[] = useMemo(() => {
    if (processes.length === 0) return [];

    return ALGORITHMS_TO_COMPARE.map((item) => {
      const pcbs = processes.map((p) =>
        createPCB({
          pid: p.pid,
          name: p.name,
          arrivalTime: p.arrivalTime,
          burstTime: p.burstTime,
          priority: p.priority,
        })
      );

      const cfg = defaultConfig({
        algorithm: item.name,
        timeQuantum: 4,
        contextSwitchCost: 0,
      });

      const scheduler = getScheduler(item.lookup);
      const result    = runSimulation(pcbs, scheduler, cfg);

      return {
        id: item.id,
        name: item.name,
        preemptive: scheduler.preemptive,
        metrics: result.metrics,
      };
    });
  }, [processes]);

  if (processes.length === 0) {
    return (
      <div className="card empty-card">
        <p className="text-muted">Add processes to see the comparative benchmark across all algorithms.</p>
      </div>
    );
  }

  // Find the maximum WT and TAT for bar scaling
  const maxWT  = Math.max(...benchmarks.map((b) => b.metrics.avgWaitingTime), 1);
  const maxTAT = Math.max(...benchmarks.map((b) => b.metrics.avgTurnaroundTime), 1);

  // Best metrics
  const minWT  = Math.min(...benchmarks.map((b) => b.metrics.avgWaitingTime));
  const minTAT = Math.min(...benchmarks.map((b) => b.metrics.avgTurnaroundTime));

  return (
    <div className="compare-section">
      {/* Comparative Bar Chart */}
      <div className="card">
        <div className="card-header">
          <h3>Algorithm Performance Benchmark (Avg WT &amp; Avg TAT)</h3>
          <div className="chart-legend">
            <span className="legend-wt">■ Avg Waiting Time (WT)</span>
            <span className="legend-tat">■ Avg Turnaround Time (TAT)</span>
          </div>
        </div>

        <div className="bars-chart-container">
          {benchmarks.map((b) => {
            const wtPct  = (b.metrics.avgWaitingTime / Math.max(maxWT, maxTAT)) * 100;
            const tatPct = (b.metrics.avgTurnaroundTime / Math.max(maxWT, maxTAT)) * 100;
            const isBestWT = b.metrics.avgWaitingTime === minWT;

            return (
              <div key={`chart-${b.id}`} className="bar-group">
                <div className="bar-labels">
                  <span className="algo-name">{b.name}</span>
                  {isBestWT && <span className="best-tag">★ Optimal WT</span>}
                </div>

                <div className="bars-track">
                  {/* WT Bar */}
                  <div
                    className="bar-fill bar-wt"
                    style={{ width: `${Math.max(wtPct, 2)}%` }}
                    title={`Avg WT: ${round(b.metrics.avgWaitingTime, 2)}`}
                  >
                    <span>{round(b.metrics.avgWaitingTime, 1)}</span>
                  </div>

                  {/* TAT Bar */}
                  <div
                    className="bar-fill bar-tat"
                    style={{ width: `${Math.max(tatPct, 2)}%` }}
                    title={`Avg TAT: ${round(b.metrics.avgTurnaroundTime, 2)}`}
                  >
                    <span>{round(b.metrics.avgTurnaroundTime, 1)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Data Table */}
      <div className="card">
        <div className="card-header">
          <h3>Summary Benchmark Table</h3>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Mode</th>
                <th>Avg WT</th>
                <th>Avg TAT</th>
                <th>Avg RT</th>
                <th>CPU Util</th>
                <th>Context Switches</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b) => (
                <tr key={`row-${b.id}`}>
                  <td>
                    <strong>{b.name}</strong>
                  </td>
                  <td>
                    <span className={`badge ${b.preemptive ? 'badge-preempt' : 'badge-nonpreempt'}`}>
                      {b.preemptive ? 'Preemptive' : 'Non-Preemptive'}
                    </span>
                  </td>
                  <td className={b.metrics.avgWaitingTime === minWT ? 'optimal-cell' : ''}>
                    {round(b.metrics.avgWaitingTime, 2)} {b.metrics.avgWaitingTime === minWT && '★'}
                  </td>
                  <td className={b.metrics.avgTurnaroundTime === minTAT ? 'optimal-cell' : ''}>
                    {round(b.metrics.avgTurnaroundTime, 2)} {b.metrics.avgTurnaroundTime === minTAT && '★'}
                  </td>
                  <td>{round(b.metrics.avgResponseTime, 2)}</td>
                  <td>{round(b.metrics.cpuUtilization, 1)}%</td>
                  <td>{b.metrics.contextSwitches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
