"""Single-qubit randomized benchmarking experiment."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.optimize import curve_fit

from spin_sim.cliffords import (
    CLIFFORD_DECOMPOSITIONS,
    generate_rb_sequence,
)
from spin_sim.device import QuantumDotArray
from spin_sim.spin import (
    STATE_0,
    apply_noisy_gate,
    measure_probability,
    sample_shots,
)
from spin_sim.cliffords import _GATES


@dataclass
class RBResult:
    qubit: int
    clifford_depths: np.ndarray
    sequence_count: int
    shot_count: int
    p_return: np.ndarray
    """Mean P(return to |0>) at each depth."""
    p_return_std: np.ndarray
    """Standard error of P(return) at each depth."""
    iq_data: np.ndarray
    """(n_depths, n_seqs, shot_count, 2) raw IQ data."""

    # Fit results
    fit_epg: float | None = None
    fit_fidelity: float | None = None
    fit_a: float | None = None
    fit_c: float | None = None
    fit_b: float | None = None
    fit_curve: np.ndarray | None = None


def _apply_clifford_noisy(rho: np.ndarray, clifford_idx: int, noise) -> np.ndarray:
    """Apply a Clifford gate-by-gate with noise on each physical gate."""
    decomp = CLIFFORD_DECOMPOSITIONS[clifford_idx]
    for gate_name in decomp:
        U = _GATES[gate_name]
        rho = apply_noisy_gate(rho, U, noise)
    return rho


def _fit_power_law(
    depths: np.ndarray, p: np.ndarray
) -> tuple[float, float, float, np.ndarray]:
    """Fit p = a * c^x + b. Returns (a, c, b, y_fit)."""

    def model(x, a, c, b):
        return a * c**x + b

    try:
        popt, _ = curve_fit(
            model,
            depths,
            p,
            p0=[0.5, 0.99, 0.5],
            bounds=([-1, 0, 0], [1, 1, 1]),
            maxfev=10000,
        )
        y_fit = model(depths, *popt)
        return popt[0], popt[1], popt[2], y_fit
    except RuntimeError:
        return 0.5, 0.99, 0.5, np.full_like(depths, 0.5, dtype=float)


def run(
    device: QuantumDotArray,
    qubit: int,
    clifford_depths: list[int] | np.ndarray,
    sequence_count: int = 30,
    shot_count: int = 1024,
    seed: int = 42,
) -> RBResult:
    rng = np.random.default_rng(seed)
    noise = device.noise
    depths = np.asarray(clifford_depths)
    n_depths = len(depths)

    p_return_all = np.empty((n_depths, sequence_count))
    iq_data = np.empty((n_depths, sequence_count, shot_count, 2))

    for di, depth in enumerate(depths):
        for si in range(sequence_count):
            seq = generate_rb_sequence(depth, rng)

            rho = STATE_0.copy()
            for cliff_idx in seq:
                rho = _apply_clifford_noisy(rho, cliff_idx, noise)

            # P(return to |0>) = 1 - P(|1>)
            p1 = measure_probability(rho, state=1)
            p0 = 1.0 - p1
            p_return_all[di, si] = p0
            iq_data[di, si] = sample_shots(p1, shot_count, noise, rng)

    p_return_mean = p_return_all.mean(axis=1)
    p_return_std = p_return_all.std(axis=1) / np.sqrt(sequence_count)

    result = RBResult(
        qubit=qubit,
        clifford_depths=depths,
        sequence_count=sequence_count,
        shot_count=shot_count,
        p_return=p_return_mean,
        p_return_std=p_return_std,
        iq_data=iq_data,
    )

    # Fit power law
    if len(depths) >= 4:
        a, c, b, y_fit = _fit_power_law(depths.astype(float), p_return_mean)
        result.fit_a = a
        result.fit_c = c
        result.fit_b = b
        result.fit_curve = y_fit

        # EPG from depolarizing parameter
        # p_clifford = c, average gates per Clifford ≈ 1.875
        avg_gates_per_clifford = 1.875
        if c > 0:
            r_clifford = (1 - c) / 2  # error per Clifford
            result.fit_epg = r_clifford / avg_gates_per_clifford
            result.fit_fidelity = 1.0 - result.fit_epg

    return result
