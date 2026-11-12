// ============================================================
// tests/ui.test.tsx — Phase 7 Frontend Component Tests
// Verifies UI renders and interacts with the simulation engine
// ============================================================

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { App } from '../src/App';
import { ProcessForm } from '../src/components/ProcessForm';
import { AlgorithmPicker } from '../src/components/AlgorithmPicker';
import { defaultConfig } from '../src/engine/simulator';

describe('Frontend UI Components', () => {
  it('renders App without crashing with all navigation tabs', () => {
    render(<App />);
    expect(screen.getByText('Single-Core CPU Scheduling Simulator')).toBeInTheDocument();
    expect(screen.getByText(/Scheduler & Step-Through/)).toBeInTheDocument();
    expect(screen.getByText(/Compare All Algorithms/)).toBeInTheDocument();
    expect(screen.getByText(/OS Concepts & Viva Notes/)).toBeInTheDocument();
  });

  it('renders AlgorithmPicker and dynamically toggles quantum field', () => {
    const config = defaultConfig({ algorithm: 'FCFS' });
    const { rerender } = render(
      <AlgorithmPicker config={config} onChangeConfig={() => {}} />
    );

    // FCFS does NOT show quantum field
    expect(screen.queryByLabelText(/Time Quantum/)).not.toBeInTheDocument();

    // Round Robin DOES show quantum field
    rerender(
      <AlgorithmPicker
        config={{ ...config, algorithm: 'Round Robin' }}
        onChangeConfig={() => {}}
      />
    );
    expect(screen.getByText(/Time Quantum/)).toBeInTheDocument();
  });

  it('allows switching between tabs', () => {
    render(<App />);

    // Click Compare tab
    fireEvent.click(screen.getByText(/Compare All Algorithms/));
    expect(screen.getByText(/Algorithm Performance Benchmark/)).toBeInTheDocument();

    // Click Notes tab
    fireEvent.click(screen.getByText(/OS Concepts & Viva Notes/));
    expect(screen.getByText(/Why SJF and SRTF Are Optimal/)).toBeInTheDocument();
  });

  it('ProcessForm validates input before submitting', () => {
    let submitted = false;
    render(
      <ProcessForm
        onAddProcess={() => { submitted = true; }}
        onLoadPreset={() => {}}
        onClear={() => {}}
        nextPid={4}
      />
    );

    // Enter negative arrival time
    const arrivalInput = screen.getByLabelText('Arrival Time');
    fireEvent.change(arrivalInput, { target: { value: '-2' } });

    fireEvent.click(screen.getByText('+ Add Process'));
    expect(screen.getByText('Arrival time cannot be negative.')).toBeInTheDocument();
    expect(submitted).toBe(false);
  });
});
