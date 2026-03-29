from __future__ import annotations

from dataclasses import dataclass


@dataclass
class NoiseModel:
    """Decoherence and error parameters for a spin qubit."""

    t1_us: float = 5000.0
    """Relaxation time in microseconds."""

    t2_star_us: float = 20.0
    """Inhomogeneous dephasing time in microseconds."""

    t2_us: float = 50.0
    """Echo coherence time in microseconds."""

    gate_error: float = 1e-3
    """Depolarizing error probability per physical gate."""

    readout_fidelity: float = 0.98
    """Probability of correct single-shot readout."""

    @classmethod
    def ideal(cls) -> NoiseModel:
        return cls(
            t1_us=1e9,
            t2_star_us=1e9,
            t2_us=1e9,
            gate_error=0.0,
            readout_fidelity=1.0,
        )

    @classmethod
    def realistic(cls) -> NoiseModel:
        return cls()

    @classmethod
    def noisy(cls) -> NoiseModel:
        return cls(
            t1_us=1000.0,
            t2_star_us=5.0,
            t2_us=15.0,
            gate_error=5e-3,
            readout_fidelity=0.95,
        )
