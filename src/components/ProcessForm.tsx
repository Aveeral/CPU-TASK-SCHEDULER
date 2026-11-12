// ============================================================
// ProcessForm.tsx — Add processes and load sample data
// ============================================================

import React, { useState } from 'react';
import { SAMPLE_PRESETS, SamplePreset } from './colorUtils';

export interface ProcessInput {
  pid: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
}

interface ProcessFormProps {
  onAddProcess: (p: ProcessInput) => void;
  onLoadPreset: (preset: SamplePreset) => void;
  onClear: () => void;
  nextPid: number;
}

export const ProcessForm: React.FC<ProcessFormProps> = ({
  onAddProcess,
  onLoadPreset,
  onClear,
  nextPid,
}) => {
  const [name, setName]               = useState(`P${nextPid}`);
  const [arrivalTime, setArrivalTime] = useState(0);
  const [burstTime, setBurstTime]     = useState(4);
  const [priority, setPriority]       = useState(1);
  const [error, setError]             = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (burstTime <= 0) {
      setError('Burst time must be greater than 0.');
      return;
    }
    if (arrivalTime < 0) {
      setError('Arrival time cannot be negative.');
      return;
    }

    onAddProcess({
      pid: nextPid,
      name: name.trim() || `P${nextPid}`,
      arrivalTime: Number(arrivalTime),
      burstTime: Number(burstTime),
      priority: Number(priority),
    });

    setName(`P${nextPid + 1}`);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Process Input</h3>
        <div className="header-actions">
          <select
            defaultValue=""
            onChange={(e) => {
              const selected = SAMPLE_PRESETS.find((p) => p.name === e.target.value);
              if (selected) onLoadPreset(selected);
              e.target.value = '';
            }}
            className="select-preset"
          >
            <option value="" disabled>
              Load Sample Data...
            </option>
            {SAMPLE_PRESETS.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={onClear} className="btn btn-outline-danger">
            Clear All
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="process-form-grid">
        <div className="form-group">
          <label htmlFor="proc-name">Process Name</label>
          <input
            id="proc-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. P1"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="proc-arrival">Arrival Time</label>
          <input
            id="proc-arrival"
            type="number"
            min="0"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(parseInt(e.target.value, 10) || 0)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="proc-burst">Burst Time</label>
          <input
            id="proc-burst"
            type="number"
            min="1"
            value={burstTime}
            onChange={(e) => setBurstTime(parseInt(e.target.value, 10) || 1)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="proc-priority">Priority</label>
          <input
            id="proc-priority"
            type="number"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
            required
          />
        </div>

        <div className="form-group submit-col">
          <label>&nbsp;</label>
          <button type="submit" className="btn btn-primary">
            + Add Process
          </button>
        </div>
      </form>

      {error && <div className="error-alert">{error}</div>}
    </div>
  );
};
