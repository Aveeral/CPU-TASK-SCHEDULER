// ============================================================
// ProcessTable.tsx — Displays configured processes
// ============================================================

import React from 'react';
import { ProcessInput } from './ProcessForm';
import { getProcessColor } from './colorUtils';

interface ProcessTableProps {
  processes: ProcessInput[];
  onDeleteProcess: (pid: number) => void;
}

export const ProcessTable: React.FC<ProcessTableProps> = ({
  processes,
  onDeleteProcess,
}) => {
  if (processes.length === 0) {
    return (
      <div className="card empty-table-card">
        <p className="text-muted">
          No processes added yet. Enter a process above or click <strong>Load Sample Data</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Process List ({processes.length})</h3>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Color</th>
              <th>PID</th>
              <th>Name</th>
              <th>Arrival Time</th>
              <th>Burst Time</th>
              <th>Priority</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((p) => (
              <tr key={p.pid}>
                <td>
                  <span
                    className="color-dot"
                    style={{ backgroundColor: getProcessColor(p.pid) }}
                    title={`Process ${p.name}`}
                  />
                </td>
                <td>{p.pid}</td>
                <td>
                  <strong>{p.name}</strong>
                </td>
                <td>{p.arrivalTime}</td>
                <td>{p.burstTime}</td>
                <td>{p.priority}</td>
                <td>
                  <button
                    onClick={() => onDeleteProcess(p.pid)}
                    className="btn btn-sm btn-outline-danger"
                    title="Remove process"
                  >
                    ✕ Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
