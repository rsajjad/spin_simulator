"""Ramsey fringe experiment: π/2 – τ – π/2 protocol, sweep delay."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.optimize import curve_fit

from spin_sim.device import QuantumDotArray
from spin_sim.spin import (
    STATE_0,
    apply_noisy_gate,
    free_evolution,
    measure_probability,
    rotation,
    sample_shots,
)


@dataclass
class RamseyResult:
    qubit: int
    drive_frequency_ghz: float
    delays_ns: np.ndarray
    p_excited: np.ndarray
    iq_data: np.ndarray

    # Fit results
    fit_detuning_mhz: float | None = None
    fit_t2_star_us: float | None = None
    fit_curve: np.ndarray | None = None


def _fit_ramsey(
    t_ns: np.ndarray, p: np.ndarray
) -> tuple[float, float, np.ndarray]:
    """Fit decaying cosine to Ramsey fringes. Returns (detuning_MHz, T2*_μs, y_fit)."""

    def model(t, a, f, phi, tau, b):
        return a * np.cos(2 * np.pi * f * t + phi) * np.exp(-t / tau) + b

    dt = t_ns[1] - t_ns[0]
    fft_vals = np.abs(np.fft.rfft(p - p.mean()))
    freqs = np.fft.rfftfreq(len(p), dt)
    peak_idx = np.argmax(fft_vals[1:]) + 1
    f_guess = freqs[peak_idx]

    try:
        popt, _ = curve_fit(
            model,
            t_ns,
            p,
            p0=[0.5, f_guess, 0.0, t_ns[-1] / 3, 0.5],
            bounds=(
                [-1, 0, -np.pi, 0, 0],
                [1, freqs[-1], np.pi, t_ns[-1] * 10, 1],
            ),
            maxfev=10000,
        )
        detuning_mhz = popt[1] * 1000.0  # GHz → MHz
        t2star_us = popt[3] / 1000.0  # ns → μs
        y_fit = model(t_ns, *popt)
        return detuning_mhz, t2star_us, y_fit
    except RuntimeError:
        return 0.0, 0.0, np.full_like(t_ns, 0.5)


def run(
    device: QuantumDotArray,
    qubit: int,
    drive_frequency_ghz: float,
    delays_ns: np.ndarray,
    shot_count: int = 1024,
    seed: int | None = None,
) -> RamseyResult:
    rng = np.random.default_rng(seed)
    noise = device.noise

    qubit_freq = device.qubit_frequencies_ghz[qubit]
    delta_ghz = drive_frequency_ghz - qubit_freq

    # π/2 pulse (ideal rotation — gate error applied via depolarizing channel)
    pi_half = rotation("x", np.pi / 2)

    n_delays = len(delays_ns)
    p_excited = np.empty(n_delays)
    iq_data = np.empty((n_delays, shot_count, 2))

    for i, tau in enumerate(delays_ns):
        rho = STATE_0.copy()
        # First π/2
        rho = apply_noisy_gate(rho, pi_half, noise)
        # Free precession for τ
        rho = free_evolution(rho, delta_ghz, tau, noise)
        # Second π/2
        rho = apply_noisy_gate(rho, pi_half, noise)

        p1 = measure_probability(rho, state=1)
        p_excited[i] = p1
        iq_data[i] = sample_shots(p1, shot_count, noise, rng)

    result = RamseyResult(
        qubit=qubit,
        drive_frequency_ghz=drive_frequency_ghz,
        delays_ns=delays_ns,
        p_excited=p_excited,
        iq_data=iq_data,
    )

    if len(delays_ns) > 10:
        det, t2s, y_fit = _fit_ramsey(delays_ns, p_excited)
        result.fit_detuning_mhz = det
        result.fit_t2_star_us = t2s
        result.fit_curve = y_fit

    return result
