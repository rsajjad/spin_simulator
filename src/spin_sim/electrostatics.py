"""Constant interaction model for computing charge ground states."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from spin_sim.device import QuantumDotArray


def _enumerate_configs(n_dots: int, n_electrons: int) -> np.ndarray:
    """Return all occupation vectors (n_1, ..., n_d) that sum to n_electrons.

    Each n_i ranges from 0 to n_electrons.
    Returns shape (n_configs, n_dots).
    """
    configs: list[tuple[int, ...]] = []

    def _recurse(remaining_dots: int, remaining_e: int, current: tuple[int, ...]):
        if remaining_dots == 0:
            if remaining_e == 0:
                configs.append(current)
            return
        for ni in range(remaining_e + 1):
            _recurse(remaining_dots - 1, remaining_e - ni, current + (ni,))

    _recurse(n_dots, n_electrons, ())
    return np.array(configs, dtype=int)


def total_energy(
    device: QuantumDotArray,
    config: np.ndarray,
    gate_voltages: np.ndarray,
) -> float:
    """Compute total electrostatic energy for a single charge configuration.

    Parameters
    ----------
    config : (n_dots,) int array — occupation numbers.
    gate_voltages : (n_gates,) float array — voltage on each gate.
    """
    n_dots = device.n_dots
    energy = 0.0
    for i in range(n_dots):
        ni = config[i]
        if ni == 0:
            continue
        # Chemical potential contribution: linear in gate voltages
        gate_coupling = device.lever_arms[i] @ gate_voltages  # eV
        energy += -gate_coupling * ni
        # On-site charging: E_C * n*(n-1)/2
        energy += device.charging_energies_meV[i] * 1e-3 * ni * (ni - 1) / 2
        # Inter-dot Coulomb
        for j in range(i + 1, n_dots):
            nj = config[j]
            energy += device.coulomb_energies_meV[i, j] * 1e-3 * ni * nj
    return energy


def charge_ground_state(
    device: QuantumDotArray,
    gate_voltages: np.ndarray,
    n_electrons: int = 3,
) -> np.ndarray:
    """Return the ground-state charge configuration for given gate voltages."""
    configs = _enumerate_configs(device.n_dots, n_electrons)
    energies = np.array(
        [total_energy(device, c, gate_voltages) for c in configs]
    )
    return configs[np.argmin(energies)]


@dataclass
class StabilityDiagramResult:
    """Result of a 2D charge stability diagram scan."""

    gate_x: str
    gate_y: str
    voltages_x: np.ndarray
    voltages_y: np.ndarray
    charge_map: np.ndarray
    """(n_y, n_x, n_dots) array of occupation numbers at each grid point."""

    @property
    def total_charge_label(self) -> np.ndarray:
        """(n_y, n_x) scalar label encoding the charge config as an integer.

        E.g. (1,1,1) → 111, (2,1,0) → 210. Convenient for plotting.
        """
        powers = 10 ** np.arange(self.charge_map.shape[-1] - 1, -1, -1)
        return (self.charge_map * powers).sum(axis=-1)


def stability_diagram(
    device: QuantumDotArray,
    gate_x: str,
    gate_y: str,
    v_range_x: tuple[float, float],
    v_range_y: tuple[float, float],
    n_points: int = 200,
    base_voltages: dict[str, float] | None = None,
    n_electrons: int = 3,
) -> StabilityDiagramResult:
    """Compute a 2D charge stability diagram by sweeping two gates.

    All gates not being swept are held at *base_voltages* (default 0.15 V
    for plungers, 0.25 V for barriers).
    """
    idx_x = device.gate_index(gate_x)
    idx_y = device.gate_index(gate_y)

    # Default operating point: middle of typical range
    defaults: dict[str, float] = {}
    for name in device.gate_names:
        defaults[name] = 0.25 if name.startswith("B") else 0.15
    if base_voltages:
        defaults.update(base_voltages)

    voltages_x = np.linspace(v_range_x[0], v_range_x[1], n_points)
    voltages_y = np.linspace(v_range_y[0], v_range_y[1], n_points)

    configs = _enumerate_configs(device.n_dots, n_electrons)
    n_configs = len(configs)

    # Vectorised energy computation over the full 2D grid
    gate_v = np.array([defaults[g] for g in device.gate_names])  # (n_gates,)

    charge_map = np.empty((n_points, n_points, device.n_dots), dtype=int)
    for iy, vy in enumerate(voltages_y):
        for ix, vx in enumerate(voltages_x):
            gv = gate_v.copy()
            gv[idx_x] = vx
            gv[idx_y] = vy
            best_e = np.inf
            best_c = configs[0]
            for ci in range(n_configs):
                e = total_energy(device, configs[ci], gv)
                if e < best_e:
                    best_e = e
                    best_c = configs[ci]
            charge_map[iy, ix] = best_c

    return StabilityDiagramResult(
        gate_x=gate_x,
        gate_y=gate_y,
        voltages_x=voltages_x,
        voltages_y=voltages_y,
        charge_map=charge_map,
    )
