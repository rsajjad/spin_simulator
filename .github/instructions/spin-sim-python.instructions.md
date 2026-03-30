---
description: "Use when working on spin physics simulations, experiments, or noise models. Covers the constant interaction electrostatics, Bloch equations, Clifford group, and experiment result dataclasses."
applyTo: "src/spin_sim/**"
---

# Spin Simulator Python Package

## Module layout
- `device.py` — QuantumDotArray with `default_1x3()` factory
- `electrostatics.py` — vectorized constant interaction model
- `spin.py` — Pauli ops, unitary propagation, noise channels, measurement
- `cliffords.py` — brute-force 24-element Clifford group
- `noise.py` — NoiseModel presets (ideal, realistic, noisy)
- `experiments/` — run() functions returning typed result dataclasses
- `plotting.py` — matplotlib visualization

## Conventions
- Units: frequencies in GHz/MHz, times in ns/μs, voltages in V
- All experiments return a dataclass with raw data + fit parameters (None if fit fails)
- Noise is applied via `NoiseModel` attached to the device via `device.with_noise(model)`
- Use numpy broadcasting and einsum for performance-critical paths
- Clifford equivalence: check `np.allclose(prod - phase * I, 0)` on the full 2×2 matrix
- Always seed RNGs with explicit `seed` or `random_state` parameters
