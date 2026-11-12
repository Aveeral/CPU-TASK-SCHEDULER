// ============================================================
// GanttChart.tsx — Visual Timeline of CPU Execution
// Renders colored blocks per process, idle gaps, and a time axis.
// ============================================================

import React from 'react';
import { GanttEntry } from '../engine/types';
import { getProcessColor } from './colorUtils';

interface GanttChartProps {
  gantt: GanttEntry[];
  currentTime?: number;
  totalTime?: number;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  gantt,
  currentTime,
}) => {
  if (gantt.length === 0) {
    return (
      <div className="card empty-gantt-card">
        <p className="text-muted">Gantt chart will appear after running the simulation.</p>
      </div>
    );
  }

  const totalDuration = gantt[gantt.length - 1]?.end || 1;

  return (
    <div className="card gantt-container">
      <div className="card-header">
        <h3>Gantt Chart Timeline</h3>
        {currentTime !== undefined && (
          <span className="badge badge-info">Current Clock: t = {currentTime}</span>
        )}
      </div>

      <div className="gantt-wrapper">
        {/* The horizontal blocks bar */}
        <div className="gantt-bar">
          {gantt.map((entry, index) => {
            const duration   = entry.end - entry.start;
            const widthPct   = (duration / totalDuration) * 100;
            const isIdle     = entry.pid === null;
            const blockColor = getProcessColor(entry.pid);

            return (
              <div
                key={`${entry.pid ?? 'idle'}-${entry.start}-${index}`}
                className={`gantt-block ${isIdle ? 'gantt-block-idle' : ''}`}
                style={{
                  width: `${Math.max(widthPct, 3)}%`,
                  backgroundColor: isIdle ? '#e2e8f0' : blockColor,
                  color: isIdle ? '#475569' : '#ffffff',
                }}
                title={`${entry.label}: [${entry.start} - ${entry.end}] (${duration} tick${duration > 1 ? 's' : ''})`}
              >
                <span className="block-label">{entry.label}</span>
                <span className="block-duration">({duration})</span>
              </div>
            );
          })}
        </div>

        {/* Time axis ticks */}
        <div className="gantt-timeline-axis">
          {/* Start tick of first block */}
          <span className="axis-tick" style={{ left: '0%' }}>
            {gantt[0].start}
          </span>

          {/* End tick of each block */}
          {gantt.map((entry, index) => {
            const posPct = (entry.end / totalDuration) * 100;
            return (
              <span
                key={`tick-${entry.end}-${index}`}
                className="axis-tick"
                style={{ left: `${posPct}%` }}
              >
                {entry.end}
              </span>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="gantt-legend">
        {Array.from(new Set(gantt.map((g) => g.pid))).map((pid) => (
          <div key={`legend-${pid ?? 'idle'}`} className="legend-item">
            <span
              className="color-dot"
              style={{ backgroundColor: getProcessColor(pid) }}
            />
            <span>{pid === null ? 'Idle (CPU / Context Switch)' : `P${pid}`}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
