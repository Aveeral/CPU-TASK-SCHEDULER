// ============================================================
// App.tsx — Main UI Component for Single-Core CPU Scheduling Simulator
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import { ProcessInput, ProcessForm } from './components/ProcessForm';
import { ProcessTable } from './components/ProcessTable';
import { AlgorithmPicker } from './components/AlgorithmPicker';
import { GanttChart } from './components/GanttChart';
import { MetricsPanel } from './components/MetricsPanel';
import { Controls } from './components/Controls';
import { QueueView } from './components/QueueView';
import { CompareView } from './components/CompareView';
import { SAMPLE_PRESETS, SamplePreset } from './components/colorUtils';
import { SimConfig, SimResult, PCB } from './engine/types';
import { createPCB } from './engine/pcb';
import { runSimulation, defaultConfig } from './engine/simulator';
import { getScheduler } from './engine/algorithms';

export const App: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'simulator' | 'compare'>('simulator');

  // Workload processes
  const [processes, setProcesses] = useState<ProcessInput[]>(
    SAMPLE_PRESETS[0].processes // Start with TC-1 basic FCFS
  );

  // Configuration
  const [config, setConfig] = useState<SimConfig>(
    defaultConfig({
      algorithm: 'FCFS',
      timeQuantum: 4,
      contextSwitchCost: 0,
      higherPriorityFirst: true,
      agingEnabled: false,
      agingInterval: 10,
    })
  );

  // Simulation run state
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying]     = useState<boolean>(false);
  const [speedMs, setSpeedMs]         = useState<number>(500);

  // Run the pure TypeScript simulation engine whenever processes or config changes
  const simulationResult: SimResult | null = useMemo(() => {
    if (processes.length === 0) return null;

    try {
      const pcbs = processes.map((p) =>
        createPCB({
          pid: p.pid,
          name: p.name,
          arrivalTime: p.arrivalTime,
          burstTime: p.burstTime,
          priority: p.priority,
        })
      );

      const scheduler = getScheduler(config.algorithm);
      return runSimulation(pcbs, scheduler, config);
    } catch (err) {
      console.error('Simulation error:', err);
      return null;
    }
  }, [processes, config]);

  const totalSteps = simulationResult?.snapshots.length ?? 0;

  // Reset clock when inputs change
  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [processes, config.algorithm, config.timeQuantum, config.contextSwitchCost]);

  // Play / Pause animation effect
  useEffect(() => {
    if (!isPlaying) return;

    if (totalSteps === 0 || currentStep >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speedMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentStep, totalSteps, speedMs]);

  // Current snapshot for step-through view
  const currentSnapshot = simulationResult?.snapshots[currentStep] ?? null;

  // Handler functions
  const handleAddProcess = (newP: ProcessInput) => {
    setProcesses((prev) => [...prev, newP]);
  };

  const handleDeleteProcess = (pid: number) => {
    setProcesses((prev) => prev.filter((p) => p.pid !== pid));
  };

  const handleLoadPreset = (preset: SamplePreset) => {
    setProcesses(preset.processes);
    setConfig((prev) => ({
      ...prev,
      algorithm: preset.defaultAlgorithm,
      timeQuantum: preset.defaultQuantum ?? prev.timeQuantum,
    }));
  };

  const handleClear = () => {
    setProcesses([]);
  };

  const handleRunAll = useCallback(() => {
    setIsPlaying(false);
    if (totalSteps > 0) {
      setCurrentStep(totalSteps - 1);
    }
  }, [totalSteps]);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const handleStepBackward = useCallback(() => {
    setIsPlaying(false);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleTogglePlay = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      setCurrentStep(0);
    }
    setIsPlaying((prev) => !prev);
  }, [currentStep, totalSteps]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  const nextPid = processes.length > 0 ? Math.max(...processes.map((p) => p.pid)) + 1 : 1;

  // Processes in snapshot or final list
  const displayProcesses: PCB[] = simulationResult?.processes ?? [];

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="app-title">
          <h1>Single-Core CPU Scheduling Simulator</h1>
          <span className="app-subtitle">
            Operating Systems Course Project • Pure TypeScript Engine &amp; Visualizer
          </span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          🖥️ Scheduler &amp; Step-Through
        </button>
        <button
          className={`nav-tab ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          📊 Compare All Algorithms
        </button>
      </nav>

      {/* Tab 1: Simulator & Step-Through */}
      {activeTab === 'simulator' && (
        <div className="tab-content">
          {/* Row 1: Input and Configuration */}
          <div className="grid-2-col">
            <ProcessForm
              onAddProcess={handleAddProcess}
              onLoadPreset={handleLoadPreset}
              onClear={handleClear}
              nextPid={nextPid}
            />
            <AlgorithmPicker config={config} onChangeConfig={setConfig} />
          </div>

          {/* Process Table */}
          <ProcessTable processes={processes} onDeleteProcess={handleDeleteProcess} />

          {/* Controls */}
          <Controls
            onRunAll={handleRunAll}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
            onTogglePlay={handleTogglePlay}
            onReset={handleReset}
            onSeek={setCurrentStep}
            isPlaying={isPlaying}
            currentStep={currentStep}
            totalSteps={totalSteps}
            speedMs={speedMs}
            onChangeSpeed={setSpeedMs}
            hasProcesses={processes.length > 0}
          />

          {/* Gantt Chart (shows live timeline up to current step) */}
          <GanttChart
            gantt={currentSnapshot ? currentSnapshot.gantt : simulationResult?.gantt ?? []}
            currentTime={currentSnapshot ? currentSnapshot.time : undefined}
          />

          {/* Queue View: live ready queue, running process, and states */}
          {currentSnapshot && (
            <QueueView
              running={currentSnapshot.running}
              readyQueue={currentSnapshot.readyQueue}
              waitingQueue={currentSnapshot.waitingQueue}
              allProcesses={displayProcesses}
              clock={currentSnapshot.time}
            />
          )}

          {/* Metrics Panel & Results Table */}
          {simulationResult && (
            <MetricsPanel
              metrics={simulationResult.metrics}
              processes={simulationResult.processes}
            />
          )}
        </div>
      )}

      {/* Tab 2: Compare All Algorithms */}
      {activeTab === 'compare' && (
        <div className="tab-content">
          <CompareView processes={processes} />
        </div>
      )}
    </div>
  );
};

export default App;
