// ============================================================
// AlgorithmPicker.tsx — Select algorithm and configure knobs
// Quantum field appears dynamically ONLY for Round Robin / MLFQ.
// ============================================================

import React from 'react';
import { SimConfig } from '../engine/types';

interface AlgorithmPickerProps {
  config: SimConfig;
  onChangeConfig: (newConfig: SimConfig) => void;
}

export const ALGORITHM_OPTIONS = [
  { id: 'FCFS',                       label: 'FCFS (First-Come, First-Served)',              isPreemptive: false },
  { id: 'SJF',                        label: 'SJF (Shortest Job First - Non-Preemptive)',     isPreemptive: false },
  { id: 'SRTF',                       label: 'SRTF (Shortest Remaining Time First - Preemptive)', isPreemptive: true },
  { id: 'Round Robin',                label: 'Round Robin (RR)',                             isPreemptive: true },
  { id: 'Priority (Non-Preemptive)',  label: 'Priority (Non-Preemptive)',                    isPreemptive: false },
  { id: 'Priority (Preemptive)',      label: 'Priority (Preemptive)',                        isPreemptive: true },
  { id: 'MLFQ',                       label: 'MLFQ (Multi-Level Feedback Queue)',             isPreemptive: true },
];

export const AlgorithmPicker: React.FC<AlgorithmPickerProps> = ({
  config,
  onChangeConfig,
}) => {
  const isRoundRobin = config.algorithm.toUpperCase().includes('ROUND ROBIN') || config.algorithm.toUpperCase() === 'RR';
  const isMLFQ       = config.algorithm.toUpperCase() === 'MLFQ';
  const isPriority   = config.algorithm.toUpperCase().includes('PRIORITY');

  const showQuantumField = isRoundRobin || isMLFQ;

  return (
    <div className="card">
      <div className="card-header">
        <h3>Algorithm &amp; Configuration</h3>
      </div>

      <div className="config-grid">
        <div className="form-group">
          <label>Scheduling Algorithm</label>
          <select
            value={config.algorithm}
            onChange={(e) =>
              onChangeConfig({ ...config, algorithm: e.target.value })
            }
            className="select-algo"
          >
            {ALGORITHM_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Time Quantum — only visible for RR and MLFQ */}
        {showQuantumField && (
          <div className="form-group quantum-field-animate">
            <label>
              Time Quantum ({isMLFQ ? 'Level 0 Quantum' : 'Quantum $q$'})
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.timeQuantum}
              onChange={(e) =>
                onChangeConfig({
                  ...config,
                  timeQuantum: Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
            />
          </div>
        )}

        <div className="form-group">
          <label>Context Switch Cost (ticks)</label>
          <input
            type="number"
            min="0"
            max="10"
            value={config.contextSwitchCost}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                contextSwitchCost: Math.max(0, parseInt(e.target.value, 10) || 0),
              })
            }
          />
        </div>

        {isPriority && (
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.higherPriorityFirst}
                onChange={(e) =>
                  onChangeConfig({ ...config, higherPriorityFirst: e.target.checked })
                }
              />
              Lower number = Higher priority
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.agingEnabled}
                onChange={(e) =>
                  onChangeConfig({ ...config, agingEnabled: e.target.checked })
                }
              />
              Enable Priority Aging
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
