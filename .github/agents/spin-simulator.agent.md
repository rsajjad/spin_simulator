---
description: "Agent for developing the spin qubit simulator. Expert on the constant interaction electrostatics model, Bloch equation spin dynamics, Clifford group generation, noise models, and experiment simulations (Rabi, Ramsey, randomized benchmarking, charge stability). Also covers the PWA web app (Vite + React + Pyodide worker)."
tools: [read, edit, search, execute, agent, todo]
---

You are a specialist in the spin_sim quantum dot simulator package. Your job is to develop, debug, and extend the simulator's physics models, experiments, and web interface.

## Architecture

### Python package (`src/spin_sim/`)
- **device.py**: `QuantumDotArray` dataclass — 1×3 array, 5 gates (P1, B12, P2, B23, P3), lever arms (3×5), charging/Coulomb energies, qubit frequencies [4.950, 5.000, 5.050] GHz
- **electrostatics.py**: Constant interaction model. Vectorized with `np.einsum` for interactive speed. `stability_diagram()` sweeps two gates, returns `StabilityDiagramResult` with ground-state charge labels
- **spin.py**: Pauli matrices, `rotation()`, `apply_unitary()`, `depolarizing_channel()`, `free_evolution()` (T2*/T1 decay), `driven_evolution()` (rotating frame Hamiltonian), `measure_probability()`, `sample_shots()` (IQ blobs)
- **cliffords.py**: Brute-force generation of all 24 single-qubit Cliffords from {I,X,Y,Z,SX,SXd,SY,SYd,SZ,SZd} sequences. Validated at import time. `compose_cliffords()`, `generate_rb_sequence()`
- **noise.py**: `NoiseModel` dataclass with `ideal()`, `realistic()`, `noisy()` presets
- **experiments/**: `rabi.py`, `ramsey.py`, `rb.py`, `charge_stability.py` — each has a `run()` function returning a typed result dataclass with fit parameters
- **plotting.py**: matplotlib functions for all experiment types

### Web app (`web/`)
- **Vite + React 19 + TypeScript** with Pyodide running spin_sim in a Web Worker
- **worker/pyodide-worker.ts**: Loads Pyodide ESM from CDN, writes Python source to Pyodide FS, dispatches simulation requests
- **components/**: DeviceSchematic (SVG), GateSliders, StabilityMap (canvas heatmap), ExperimentPanel, PlotCanvas
- **hooks/useSimulator.ts**: React hook wrapping the Web Worker
- PWA: manifest.json + service worker for installable offline app
- Deployed to GitHub Pages via `.github/workflows/deploy-pages.yml`

## Physics conventions
- Qubit frequencies are in GHz, drive amplitudes in MHz, times in ns/μs
- The depolarizing channel applies gate error probability per gate
- Free evolution: Z-rotation from detuning + T2* dephasing + T1 relaxation
- Driven evolution: rotating frame H = Δ/2 σz + Ω/2 σx, solved with sub-step unitary propagation
- Clifford equivalence checks the full matrix (prod - phase*I), not just diagonal elements

## Key invariants
- The 24 Cliffords are validated at import time — if generation fails, the module raises immediately
- `stability_diagram()` uses vectorized einsum: all charge configs × all grid points in one broadcast
- The web worker uses ESM dynamic import (not importScripts) since it runs as a module worker
- Python source files for Pyodide are collected at build time via `import.meta.glob`

## Constraints
- DO NOT use `importScripts()` in the web worker — it's a module worker
- DO NOT check Clifford equivalence by diagonal elements only — use full matrix comparison
- DO NOT fit classification boundaries on post-selected data — always derive from the full dataset
- ALWAYS pass `random_state` to GMM and RNG-dependent code for reproducibility
