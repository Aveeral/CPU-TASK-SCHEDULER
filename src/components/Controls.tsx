// ============================================================
// Controls.tsx — Simulation playback and step controls
// ============================================================

import React from 'react';

interface ControlsProps {
  onRunAll: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onSeek: (stepIndex: number) => void;
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speedMs: number;
  onChangeSpeed: (ms: number) => void;
  hasProcesses: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  onRunAll,
  onStepForward,
  onStepBackward,
  onTogglePlay,
  onReset,
  onSeek,
  isPlaying,
  currentStep,
  totalSteps,
  speedMs,
  onChangeSpeed,
  hasProcesses,
}) => {
  const isAtEnd   = totalSteps > 0 && currentStep >= totalSteps - 1;
  const isAtStart = currentStep <= 0;

  return (
    <div className="card controls-card">
      <div className="controls-row">
        {/* Playback action buttons */}
        <div className="button-group">
          <button
            onClick={onRunAll}
            disabled={!hasProcesses}
            className="btn btn-primary"
            title="Execute entire simulation immediately"
          >
            ⚡ Run All
          </button>

          <button
            onClick={onTogglePlay}
            disabled={!hasProcesses || (isAtEnd && !isPlaying)}
            className={`btn ${isPlaying ? 'btn-warning' : 'btn-success'}`}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <button
            onClick={onStepBackward}
            disabled={isAtStart || isPlaying || !hasProcesses}
            className="btn btn-secondary"
            title="Step backward 1 tick"
          >
            ⏮ Step Back
          </button>

          <button
            onClick={onStepForward}
            disabled={isAtEnd || isPlaying || !hasProcesses}
            className="btn btn-secondary"
            title="Step forward 1 tick"
          >
            Step Forward ⏭
          </button>

          <button
            onClick={onReset}
            disabled={!hasProcesses}
            className="btn btn-outline"
            title="Reset clock to t=0"
          >
            ↺ Reset
          </button>
        </div>

        {/* Speed Selector */}
        <div className="speed-control">
          <label>Speed:</label>
          <select
            value={speedMs}
            onChange={(e) => onChangeSpeed(Number(e.target.value))}
            className="select-speed"
          >
            <option value={1000}>0.5x (Slow - 1000ms)</option>
            <option value={500}>1x (Normal - 500ms)</option>
            <option value={250}>2x (Fast - 250ms)</option>
            <option value={100}>5x (Turbo - 100ms)</option>
          </select>
        </div>
      </div>

      {/* Interactive scrubber */}
      {totalSteps > 0 && (
        <div className="scrubber-row">
          <span className="step-counter">
            Tick {currentStep} / {totalSteps - 1}
          </span>
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
            value={currentStep}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="scrubber-slider"
          />
        </div>
      )}
    </div>
  );
};
