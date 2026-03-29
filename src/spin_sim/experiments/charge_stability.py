"""Charge stability diagram experiment: sweep two gates, find ground-state charge config."""

from __future__ import annotations

from spin_sim.device import QuantumDotArray
from spin_sim.electrostatics import StabilityDiagramResult, stability_diagram


def run(
    device: QuantumDotArray,
    gate_x: str,
    gate_y: str,
    v_range_x: tuple[float, float] = (-0.1, 0.3),
    v_range_y: tuple[float, float] = (-0.1, 0.3),
    n_points: int = 200,
    base_voltages: dict[str, float] | None = None,
    n_electrons: int = 3,
) -> StabilityDiagramResult:
    """Run a charge stability diagram by sweeping *gate_x* and *gate_y*."""
    return stability_diagram(
        device,
        gate_x=gate_x,
        gate_y=gate_y,
        v_range_x=v_range_x,
        v_range_y=v_range_y,
        n_points=n_points,
        base_voltages=base_voltages,
        n_electrons=n_electrons,
    )
