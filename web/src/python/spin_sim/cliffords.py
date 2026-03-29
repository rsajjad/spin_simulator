"""Single-qubit Clifford group: 24 elements with decompositions into physical gates."""

from __future__ import annotations

import numpy as np

from spin_sim.spin import rotation

# Physical gate set used in decompositions
_GATES = {
    "I": np.eye(2, dtype=complex),
    "X": rotation("x", np.pi),
    "Y": rotation("y", np.pi),
    "Z": rotation("z", np.pi),
    "SX": rotation("x", np.pi / 2),
    "SXd": rotation("x", -np.pi / 2),
    "SY": rotation("y", np.pi / 2),
    "SYd": rotation("y", -np.pi / 2),
    "SZ": rotation("z", np.pi / 2),
    "SZd": rotation("z", -np.pi / 2),
}

def _compile(decomp: list[str]) -> np.ndarray:
    """Compute the unitary for a decomposition (first gate acts first on state)."""
    U = np.eye(2, dtype=complex)
    for gate_name in decomp:
        U = _GATES[gate_name] @ U
    return U


def _unitaries_equivalent(U1: np.ndarray, U2: np.ndarray) -> bool:
    """Check if two 2×2 unitaries are equal up to global phase."""
    prod = U1 @ U2.conj().T
    phase = prod[0, 0]
    if abs(phase) < 1e-10:
        return False
    residual = prod - phase * np.eye(2)
    return np.max(np.abs(residual)) < 1e-6


def _generate_all_cliffords() -> tuple[list[list[str]], list[np.ndarray]]:
    """Brute-force generate all 24 single-qubit Cliffords from the gate set.

    Systematically tries all 1- and 2-gate sequences from the physical gate set,
    keeping only distinct unitaries (mod global phase). The single-qubit Clifford
    group has exactly 24 elements.
    """
    # Use the full gate set for building sequences
    gate_names = ["I", "X", "Y", "Z", "SX", "SXd", "SY", "SYd", "SZ", "SZd"]
    decomps: list[list[str]] = []
    unitaries: list[np.ndarray] = []

    def _is_new(U: np.ndarray) -> bool:
        return not any(_unitaries_equivalent(U, existing) for existing in unitaries)

    # Length 1
    for g in gate_names:
        U = _compile([g])
        if _is_new(U):
            decomps.append([g])
            unitaries.append(U)

    # Length 2
    for g1 in gate_names:
        for g2 in gate_names:
            U = _compile([g1, g2])
            if _is_new(U):
                decomps.append([g1, g2])
                unitaries.append(U)
            if len(unitaries) == 24:
                return decomps, unitaries

    # Length 3 (only if needed)
    for g1 in gate_names:
        for g2 in gate_names:
            for g3 in gate_names:
                U = _compile([g1, g2, g3])
                if _is_new(U):
                    decomps.append([g1, g2, g3])
                    unitaries.append(U)
                if len(unitaries) == 24:
                    return decomps, unitaries

    raise RuntimeError(f"Only found {len(unitaries)} Cliffords, expected 24")


CLIFFORD_DECOMPOSITIONS, CLIFFORD_UNITARIES = _generate_all_cliffords()
"""All 24 single-qubit Clifford unitaries as 2×2 complex matrices."""


def inverse_clifford(index: int) -> int:
    """Return the index of the Clifford that inverts CLIFFORD_UNITARIES[index]."""
    U = CLIFFORD_UNITARIES[index]
    for j, Uj in enumerate(CLIFFORD_UNITARIES):
        product = Uj @ U
        if _unitaries_equivalent(product, np.eye(2)):
            return j
    raise RuntimeError(f"Could not find inverse of Clifford {index}")


def _build_inverse_table() -> list[int]:
    return [inverse_clifford(i) for i in range(24)]


CLIFFORD_INVERSES: list[int] = _build_inverse_table()
"""CLIFFORD_INVERSES[i] = j means Clifford j is the inverse of Clifford i."""


def compose_cliffords(a: int, b: int) -> int:
    """Return index c such that C_c = C_b @ C_a (apply a then b)."""
    product = CLIFFORD_UNITARIES[b] @ CLIFFORD_UNITARIES[a]
    for j, Uj in enumerate(CLIFFORD_UNITARIES):
        if _unitaries_equivalent(product, Uj):
            return j
    raise RuntimeError("Product is not a Clifford — table error")


def generate_rb_sequence(
    depth: int,
    rng: np.random.Generator,
) -> list[int]:
    """Generate a random Clifford RB sequence of given depth + recovery gate.

    Returns a list of Clifford indices of length (depth + 1).
    The last element is the recovery Clifford that maps the composite back to I.
    """
    if depth == 0:
        return [0]  # identity

    indices = [int(rng.integers(0, 24)) for _ in range(depth)]

    # Compute net Clifford
    net = indices[0]
    for i in range(1, depth):
        net = compose_cliffords(net, indices[i])

    # Recovery = inverse of net
    indices.append(CLIFFORD_INVERSES[net])
    return indices
