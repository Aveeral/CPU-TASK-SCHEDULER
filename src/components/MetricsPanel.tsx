// ============================================================
// MetricsPanel.tsx — Displays computed metrics and results table
// ============================================================

import React from 'react';
import { AggregateMetrics, PCB } from '../engine/types';
import { round } from '../engine/metrics';
import { getProcessColor } from './colorUtils';

interface MetricsPanelProps {
  metrics: AggregateMetrics | null;
  processes: PCB[];
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  processes,
}) => {
  if (!metrics || processes.length === 0) {
    return null;
  }

  return (
    <div className="metrics-section">
      {/* Aggregate KPI Summary Cards */}
      <div className="metrics-cards-grid">
        <div className="metric-card">
          <span className="metric-title">Average Waiting Time</span>
          <span className="metric-value">{round(metrics.avgWaitingTime, 2)}</span>
          <span className="metric-sub">ticks</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Average Turnaround</span>
          <span className="metric-value">{round(metrics.avgTurnaroundTime, 2)}</span>
          <span className="metric-sub">ticks</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Average Response</span>
          <span className="metric-value">{round(metrics.avgResponseTime, 2)}</span>
          <span className="metric-sub">ticks</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">CPU Utilization</span>
          <span className="metric-value">{round(metrics.cpuUtilization, 1)}%</span>
          <span className="metric-sub">
            {metrics.cpuUtilization === 100 ? 'Full Efficiency' : 'Includes Idle/Overhead'}
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Throughput</span>
          <span className="metric-value">{round(metrics.throughput, 3)}</span>
          <span className="metric-sub">proc / tick</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Context Switches</span>
          <span className="metric-value">{metrics.contextSwitches}</span>
          <span className="metric-sub">dispatches</span>
        </div>
      </div>

      {/* Per-process detailed results table */}
      <div className="card">
        <div className="card-header">
          <h3>Process Results Table</h3>
          <span className="text-muted text-sm">
            TAT = Completion − Arrival | WT = TAT − Burst | RT = Start − Arrival
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Process</th>
                <th>Arrival ($A$)</th>
                <th>Burst ($B$)</th>
                <th>First CPU ($S$)</th>
                <th>Completion ($C$)</th>
                <th>Turnaround ($TAT$)</th>
                <th>Waiting ($WT$)</th>
                <th>Response ($RT$)</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((p) => (
                <tr key={p.pid}>
                  <td>
                    <span
                      className="color-dot"
                      style={{ backgroundColor: getProcessColor(p.pid) }}
                    />
                    <strong>{p.name}</strong>
                  </td>
                  <td>{p.arrivalTime}</td>
                  <td>{p.burstTime}</td>
                  <td>{p.startTime ?? '—'}</td>
                  <td>{p.completionTime ?? '—'}</td>
                  <td>
                    <span className="highlight-pill">{p.turnaroundTime ?? '—'}</span>
                  </td>
                  <td>
                    <span className="highlight-pill pill-wt">{p.waitingTime ?? '—'}</span>
                  </td>
                  <td>{p.responseTime ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
