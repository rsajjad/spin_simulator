# Spin Qubit Simulator

Simulate a **1×3 linear quantum dot array** with 3 electrons, 5 gate electrodes,
and a magnetic field gradient producing ~50 MHz qubit frequency splittings around 5 GHz.

## Features

- **Charge stability diagrams** for any pair of the 5 gates (3 plungers + 2 barriers)
- **Rabi oscillations** with tunable drive frequency and amplitude
- **Ramsey fringes** measuring detuning and T₂*
- **1Q randomized benchmarking** with configurable gate errors
- Realistic shot noise and IQ readout simulation

## Install

```bash
pip install -e ".[notebook]"
```

## Quick start

```python
from spin_sim import QuantumDotArray
from spin_sim.experiments import charge_stability, rabi, ramsey, rb
from spin_sim.plotting import plot_charge_stability, plot_rabi, plot_ramsey, plot_rb
import numpy as np

device = QuantumDotArray.default_1x3()

# Charge stability diagram
result = charge_stability.run(device, gate_x="P1", gate_y="P2",
                               v_range_x=(-0.1, 0.3), v_range_y=(-0.1, 0.3))
plot_charge_stability(result)

# Rabi oscillations
result = rabi.run(device, qubit=1, drive_frequency_ghz=5.0,
                  drive_amplitude_mhz=10.0,
                  durations_ns=np.linspace(0, 500, 100))
plot_rabi(result)

# Ramsey fringes
result = ramsey.run(device, qubit=1, drive_frequency_ghz=5.002,
                    delays_ns=np.linspace(0, 5000, 200))
plot_ramsey(result)

# Randomized benchmarking
result = rb.run(device, qubit=1,
                clifford_depths=[1, 5, 10, 20, 50, 100, 200, 500],
                sequence_count=30, shot_count=1024, seed=42)
plot_rb(result)
```

## Web App

A browser-based PWA runs the full simulator client-side using [Pyodide](https://pyodide.org/) (Python compiled to WebAssembly). No server or installation required.

**Live app**: [https://rsajjad.github.io/spin_simulator/](https://rsajjad.github.io/spin_simulator/)

### Install on iPhone / Android

1. Open the link above in Safari (iOS) or Chrome (Android)
2. Tap **Share → Add to Home Screen** (iOS) or the install banner (Android)
3. The app launches full-screen like a native app and works offline after first load

### Run locally

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:5173/spin_simulator/](http://localhost:5173/spin_simulator/) in your browser.

### Features

- Interactive **charge stability diagram** with gate voltage sliders
- **Rabi**, **Ramsey**, and **randomized benchmarking** experiment panels
- SVG device schematic with qubit selection
- All computation runs in a Web Worker (UI stays responsive)
