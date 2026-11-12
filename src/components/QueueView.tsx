// ============================================================
// QueueView.tsx — Live visualization of OS Queues and CPU state
// ============================================================

import React from 'react';
import { PCB, ProcessState } from '../engine/types';
import { getProcessColor } from './colorUtils';

interface QueueViewProps {
  running: PCB | null;
  readyQueue: PCB[];
  waitingQueue: PCB[];
  allProcesses: PCB[];
  clock: number;
}

export const QueueView: React.FC<QueueViewProps> = ({
  running,
  readyQueue,
  waitingQueue,
  allProcesses,
  clock,
}) => {
  return (
    <div className="queue-view-grid">
      {/* 1. CPU Core (Running Process) */}
      <div className="card cpu-card">
        <div className="card-header">
          <h4>CPU Core (t = {clock})</h4>
          <span className={`status-badge ${running ? 'badge-running' : 'badge-idle'}`}>
            {running ? 'BUSY' : 'IDLE'}
          </span>
        </div>

        {running ? (
          <div className="cpu-active-process">
            <div
              className="process-avatar"
              style={{ backgroundColor: getProcessColor(running.pid) }}
            >
              {running.name}
            </div>
            <div className="process-details">
              <h4>{running.name} (PID {running.pid})</h4>
              <p>
                Remaining: <strong>{running.remainingTime}</strong> / {running.burstTime} ticks
              </p>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.round(
                      ((running.burstTime - running.remainingTime) / running.burstTime) * 100
                    )}%`,
                    backgroundColor: getProcessColor(running.pid),
                  }}
                />
              </div>
              <small className="text-muted">Priority: {running.priority}</small>
            </div>
          </div>
        ) : (
          <div className="cpu-idle-state">
            <span className="idle-icon">⚡</span>
            <p>CPU is currently Idle</p>
          </div>
        )}
      </div>

      {/* 2. Ready Queue */}
      <div className="card ready-queue-card">
        <div className="card-header">
          <h4>Ready Queue ({readyQueue.length})</h4>
          <small className="text-muted">Head → Tail (Next to dispatch at left)</small>
        </div>

        {readyQueue.length === 0 ? (
          <p className="text-muted text-center py-4">Ready queue is empty</p>
        ) : (
          <div className="queue-list horizontal-queue">
            {readyQueue.map((p, idx) => (
              <div
                key={`rq-${p.pid}-${idx}`}
                className="queue-item"
                style={{ borderLeftColor: getProcessColor(p.pid) }}
              >
                <div className="queue-item-header">
                  <span className="queue-pos">#{idx + 1}</span>
                  <strong>{p.name}</strong>
                </div>
                <div className="queue-item-stats">
                  <span>Rem: {p.remainingTime}</span>
                  <span>Pri: {p.priority}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Waiting Queue (I/O) */}
      {waitingQueue.length > 0 && (
        <div className="card waiting-queue-card">
          <div className="card-header">
            <h4>Waiting Queue (I/O Blocked: {waitingQueue.length})</h4>
          </div>
          <div className="queue-list horizontal-queue">
            {waitingQueue.map((p, idx) => (
              <div
                key={`wq-${p.pid}-${idx}`}
                className="queue-item item-waiting"
                style={{ borderLeftColor: '#f59e0b' }}
              >
                <strong>{p.name}</strong>
                <span>I/O Remaining: {p.ioCountdown} ticks</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Process States Summary Table */}
      <div className="card process-state-card">
        <div className="card-header">
          <h4>Live Process States</h4>
        </div>
        <div className="state-tags-list">
          {allProcesses.map((p) => {
            let badgeClass = 'state-new';
            if (p.state === ProcessState.READY)      badgeClass = 'state-ready';
            if (p.state === ProcessState.RUNNING)    badgeClass = 'state-running';
            if (p.state === ProcessState.WAITING)    badgeClass = 'state-waiting';
            if (p.state === ProcessState.TERMINATED) badgeClass = 'state-terminated';

            return (
              <div key={`state-${p.pid}`} className="process-state-chip">
                <span
                  className="color-dot"
                  style={{ backgroundColor: getProcessColor(p.pid) }}
                />
                <span className="chip-name">{p.name}:</span>
                <span className={`chip-state ${badgeClass}`}>{p.state}</span>
                <span className="chip-rem">({p.remainingTime} left)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
