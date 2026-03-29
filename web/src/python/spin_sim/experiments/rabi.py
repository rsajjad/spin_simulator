"""Rabi oscillation experiment: sweep drive duration, measure P(|1>)."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.optimize import curve_fit

from spin_sim.device import QuantumDotArray
from spin_sim.spin import (
    STATE_0,
    driven_evolution,
    measure_probability,
    sample_shots,
)


@dataclass
class RabiResult:
    qubit: int
    drive_frequency_ghz: float
    drive_amplitude_mhz: float
    durations_ns: np.ndarray
    p_excited: np.ndarray
    """Mean P(|1>) at each duration."""
    iq_data: np.ndarray
    """(n_durations, shot_count, 2) raw IQ data."""

    # Fit results (populated after fitting)
    fit_frequency_mhz: float | None = None
    fit_decay_us: float | None = None
    fit_pi_time_ns: float | None = None
    fit_curve: np.ndarray | None = None


def _fit_decaying_cosine(
    t_ns: np.ndarray, p: np.ndarray
) -> tuple[float, float, np.ndarray]:
    """Fit p = a * cos(2π f t) * exp(-t/τ) + b. Returns (f_MHz, τ_μs, y_fit)."""

    def model(t, a, f, phi, tau, b):
        return a * np.cos(2 * np.pi * f * t + phi) * np.exp(-t / tau) + b

    # Initial guess from FFT
    dt = t_ns[1] - t_ns[0]
    fft_vals = np.abs(np.fft.rfft(p - p.mean()))
    freqs = np.fft.rfftfreq(len(p), dt)
    peak_idx = np.argmax(fft_vals[1:]) + 1  # skip DC
    f_guess = freqs[peak_idx]

    try:
        popt, _ = curve_fit(
            model,
            t_ns,
            p,
            p0=[0.5, f_guess, 0.0, t_ns[-1] / 2, 0.5],
            bounds=(
                [-1, 0, -np.pi, 0, 0],
                [1, freqs[-1], np.pi, t_ns[-1] * 10, 1],
            ),
            maxfev=10000,
        )
        f_mhz = popt[1] * 1e3  # GHz → MHz (t is in ns, so f is in GHz already)
        # Actually f is in cycles/ns = GHz. Convert to MHz:
        f_mhz = popt[1] * 1000.0
        tau_us = popt[3] / 1000.0  # ns → μs
        y_fit = model(t_ns, *popt)
        return f_mhz, tau_us, y_fit
    except RuntimeError:
        return 0.0, 0.0, np.full_like(t_ns, 0.5)


def run(
    device: QuantumDotArray,
    qubit: int,
    drive_frequency_ghz: float,
    drive_amplitude_mhz: float,
    durations_ns: np.ndarray,
    shot_count: int = 1024,
    seed: int | None = None,
) -> RabiResult:
    rng = np.random.default_rng(seed)
    noise = device.noise

    qubit_freq = device.qubit_frequencies_ghz[qubit]
    delta_ghz = drive_frequency_ghz - qubit_freq  # detuning
    rabi_rate_ghz = drive_amplitude_mhz / 1000.0  # MHz → GHz

    n_dur = len(durations_ns)
    p_excited = np.empty(n_dur)
    iq_data = np.empty((n_dur, shot_count, 2))

    for i, dur in enumerate(durations_ns):
        rho = STATE_0.copy()
        rho = driven_evolution(
            rho, delta_ghz, rabi_rate_ghz, dur, noise,
            n_steps=max(1, int(dur / 5.0)),
        )
        p1 = measure_probability(rho, state=1)
        p_excited[i] = p1
        iq_data[i] = sample_shots(p1, shot_count, noise, rng)

    result = RabiResult(
        qubit=qubit,
        drive_frequency_ghz=drive_frequency_ghz,
        drive_amplitude_mhz=drive_amplitude_mhz,
        durations_ns=durations_ns,
        p_excited=p_excited,
        iq_data=iq_data,
    )

    # Fit
    if len(durations_ns) > 10:
        f_mhz, tau_us, y_fit = _fit_decaying_cosine(durations_ns, p_excited)
        result.fit_frequency_mhz = f_mhz
        result.fit_decay_us = tau_us
        result.fit_pi_time_ns = 500.0 / f_mhz if f_mhz > 0 else None
        result.fit_curve = y_fit

    return result
