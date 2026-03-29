"""Single-qubit spin dynamics via Bloch equations and density matrix operations."""

from __future__ import annotations

import numpy as np

from spin_sim.noise import NoiseModel

# Pauli matrices
SIGMA_X = np.array([[0, 1], [1, 0]], dtype=complex)
SIGMA_Y = np.array([[0, -1j], [1j, 0]], dtype=complex)
SIGMA_Z = np.array([[1, 0], [0, -1]], dtype=complex)
IDENTITY = np.eye(2, dtype=complex)

# Standard states
STATE_0 = np.array([[1, 0], [0, 0]], dtype=complex)  # |0><0| (ground / spin-down)
STATE_1 = np.array([[0, 0], [0, 1]], dtype=complex)  # |1><1| (excited / spin-up)


def rotation(axis: str, angle: float) -> np.ndarray:
    """Unitary rotation R_axis(angle) = exp(-i * angle/2 * sigma_axis)."""
    if axis == "x":
        sigma = SIGMA_X
    elif axis == "y":
        sigma = SIGMA_Y
    elif axis == "z":
        sigma = SIGMA_Z
    else:
        raise ValueError(f"Unknown axis: {axis}")
    return np.cos(angle / 2) * IDENTITY - 1j * np.sin(angle / 2) * sigma


def apply_unitary(rho: np.ndarray, U: np.ndarray) -> np.ndarray:
    """Apply a unitary: rho -> U @ rho @ U†."""
    return U @ rho @ U.conj().T


def depolarizing_channel(rho: np.ndarray, p: float) -> np.ndarray:
    """Single-qubit depolarizing channel: rho -> (1-p)*rho + p*I/2."""
    return (1 - p) * rho + p * IDENTITY / 2


def apply_noisy_gate(rho: np.ndarray, U: np.ndarray, noise: NoiseModel) -> np.ndarray:
    """Apply a unitary gate followed by depolarizing noise."""
    rho = apply_unitary(rho, U)
    if noise.gate_error > 0:
        rho = depolarizing_channel(rho, noise.gate_error)
    return rho


def free_evolution(
    rho: np.ndarray,
    delta_ghz: float,
    duration_ns: float,
    noise: NoiseModel,
) -> np.ndarray:
    """Free precession in the rotating frame for *duration_ns* nanoseconds.

    Applies:
      - Z-rotation by angle = 2π * delta_ghz * duration_ns (detuning precession)
      - T2* dephasing: off-diagonals decay as exp(-t / T2*)
      - T1 relaxation: population relaxes toward |0> as exp(-t / T1)
    """
    t_us = duration_ns / 1000.0

    # Coherent Z-rotation from detuning
    angle = 2 * np.pi * delta_ghz * duration_ns  # GHz * ns = dimensionless
    Rz = rotation("z", angle)
    rho = apply_unitary(rho, Rz)

    # T2* dephasing of off-diagonals
    if noise.t2_star_us < 1e8:
        gamma_phi = np.exp(-t_us / noise.t2_star_us)
        rho[0, 1] *= gamma_phi
        rho[1, 0] *= gamma_phi

    # T1 relaxation
    if noise.t1_us < 1e8:
        gamma_1 = np.exp(-t_us / noise.t1_us)
        p1 = rho[1, 1].real
        rho[1, 1] = p1 * gamma_1
        rho[0, 0] = 1.0 - rho[1, 1].real
        # Off-diagonals also decay from T1
        gamma_1_half = np.sqrt(gamma_1)
        rho[0, 1] *= gamma_1_half
        rho[1, 0] *= gamma_1_half

    return rho


def driven_evolution(
    rho: np.ndarray,
    delta_ghz: float,
    rabi_rate_ghz: float,
    duration_ns: float,
    noise: NoiseModel,
    n_steps: int = 1,
) -> np.ndarray:
    """Continuous microwave drive in the rotating frame.

    For a resonant drive (delta=0), this produces Rabi oscillations.
    Uses the effective Hamiltonian H = (Δ/2)σ_z + (Ω/2)σ_x and
    applies the exact unitary for a constant Hamiltonian over the duration,
    with T1/T2 decay applied per sub-step.
    """
    dt_ns = duration_ns / n_steps
    dt_us = dt_ns / 1000.0

    # Effective rotation axis and rate
    omega_eff = np.sqrt(delta_ghz**2 + rabi_rate_ghz**2)
    if omega_eff < 1e-15:
        return rho

    # Unit vector along H direction: (Ω, 0, Δ) / |...|
    nx = rabi_rate_ghz / omega_eff
    nz = delta_ghz / omega_eff

    for _ in range(n_steps):
        # Unitary: exp(-i * omega_eff * pi * dt_ns * (nx*σx + nz*σz))
        angle = 2 * np.pi * omega_eff * dt_ns  # full rotation angle
        U = np.cos(angle / 2) * IDENTITY - 1j * np.sin(angle / 2) * (
            nx * SIGMA_X + nz * SIGMA_Z
        )
        rho = apply_unitary(rho, U)

        # Decoherence during drive (use T2 not T2* since drive refocuses some noise)
        if noise.t2_us < 1e8:
            gamma = np.exp(-dt_us / noise.t2_us)
            rho[0, 1] *= gamma
            rho[1, 0] *= gamma
        if noise.t1_us < 1e8:
            gamma_1 = np.exp(-dt_us / noise.t1_us)
            p1 = rho[1, 1].real
            rho[1, 1] = p1 * gamma_1
            rho[0, 0] = 1.0 - rho[1, 1].real
            rho[0, 1] *= np.sqrt(gamma_1)
            rho[1, 0] *= np.sqrt(gamma_1)

    return rho


def measure_probability(rho: np.ndarray, state: int = 1) -> float:
    """Return the probability of measuring |state> (0 or 1)."""
    return rho[state, state].real


def sample_shots(
    p_excited: float,
    shot_count: int,
    noise: NoiseModel,
    rng: np.random.Generator,
) -> np.ndarray:
    """Generate simulated IQ readout data for a given P(|1>).

    Returns (shot_count, 2) array of [I, Q] values.
    Ground state centred at (-1, 0), excited at (+1, 0) with Gaussian noise.
    Readout fidelity is modelled as a probability of mis-assignment.
    """
    # Apply readout infidelity
    p_eff = p_excited * noise.readout_fidelity + (1 - p_excited) * (
        1 - noise.readout_fidelity
    )

    outcomes = rng.random(shot_count) < p_eff  # True = excited
    iq = np.empty((shot_count, 2))

    sigma = 0.3  # IQ scatter
    mean_0 = np.array([-1.0, 0.0])
    mean_1 = np.array([1.0, 0.0])

    for i in range(shot_count):
        centre = mean_1 if outcomes[i] else mean_0
        iq[i] = rng.normal(centre, sigma)

    return iq
