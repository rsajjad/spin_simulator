from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from spin_sim.noise import NoiseModel


@dataclass
class QuantumDotArray:
    """A 1×N linear quantum dot array with plunger and barrier gates."""

    n_dots: int = 3
    gate_names: list[str] = field(
        default_factory=lambda: ["P1", "B12", "P2", "B23", "P3"]
    )

    # Electrostatics ---------------------------------------------------------
    lever_arms: np.ndarray = field(default_factory=lambda: np.eye(3, 5))
    """(n_dots, n_gates) matrix: α_ij coupling from gate j to dot i, in eV/V."""

    charging_energies_meV: np.ndarray = field(
        default_factory=lambda: np.array([3.0, 3.0, 3.0])
    )
    """On-site charging energy E_C for each dot (meV)."""

    coulomb_energies_meV: np.ndarray = field(
        default_factory=lambda: np.zeros((3, 3))
    )
    """Inter-dot Coulomb energy E_Cij (meV). Symmetric, diagonal = 0."""

    # Spin properties --------------------------------------------------------
    qubit_frequencies_ghz: np.ndarray = field(
        default_factory=lambda: np.array([4.950, 5.000, 5.050])
    )
    """Qubit resonance frequencies in GHz (set by B_0 + gradient)."""

    # Noise ------------------------------------------------------------------
    noise: NoiseModel = field(default_factory=NoiseModel.realistic)

    def with_noise(self, noise: NoiseModel) -> QuantumDotArray:
        """Return a copy of this device with a different noise model."""
        return QuantumDotArray(
            n_dots=self.n_dots,
            gate_names=list(self.gate_names),
            lever_arms=self.lever_arms.copy(),
            charging_energies_meV=self.charging_energies_meV.copy(),
            coulomb_energies_meV=self.coulomb_energies_meV.copy(),
            qubit_frequencies_ghz=self.qubit_frequencies_ghz.copy(),
            noise=noise,
        )

    @classmethod
    def default_1x3(cls) -> QuantumDotArray:
        """Create a realistic 1×3 array with 5 gates.

        Gate order: P1, B12, P2, B23, P3.
        Lever arms encode gate-to-dot coupling (~0.10 eV/V primary),
        with uniform cross-talk for both plunger and barrier gates.
        Barriers couple equally to both adjacent dots.
        """
        # rows = dots, cols = gates [P1, B12, P2, B23, P3]
        lever_arms = np.array(
            [
                [0.10, 0.10, 0.01, 0.00, 0.00],  # dot 1
                [0.01, 0.10, 0.10, 0.10, 0.01],  # dot 2
                [0.00, 0.00, 0.01, 0.10, 0.10],  # dot 3
            ]
        )

        charging_energies = np.array([3.0, 3.5, 3.0])  # meV

        coulomb_energies = np.array(
            [
                [0.0, 0.8, 0.2],
                [0.8, 0.0, 0.8],
                [0.2, 0.8, 0.0],
            ]
        )  # meV

        return cls(
            n_dots=3,
            gate_names=["P1", "B12", "P2", "B23", "P3"],
            lever_arms=lever_arms,
            charging_energies_meV=charging_energies,
            coulomb_energies_meV=coulomb_energies,
            qubit_frequencies_ghz=np.array([4.950, 5.000, 5.050]),
            noise=NoiseModel.realistic(),
        )

    def gate_index(self, name: str) -> int:
        return self.gate_names.index(name)

    def __repr__(self) -> str:
        freqs = ", ".join(f"{f:.3f}" for f in self.qubit_frequencies_ghz)
        return (
            f"QuantumDotArray(1x{self.n_dots})\n"
            f"  Gates: {', '.join(self.gate_names)}\n"
            f"  Qubit frequencies: [{freqs}] GHz\n"
            f"  T1={self.noise.t1_us/1000:.1f} ms, "
            f"T2*={self.noise.t2_star_us:.1f} μs, "
            f"T2={self.noise.t2_us:.1f} μs"
        )
