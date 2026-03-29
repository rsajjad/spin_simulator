"""Plotting functions for all spin simulator experiments."""

from __future__ import annotations

from typing import TYPE_CHECKING

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import ListedColormap

if TYPE_CHECKING:
    from matplotlib.figure import Figure

    from spin_sim.electrostatics import StabilityDiagramResult
    from spin_sim.experiments.rabi import RabiResult
    from spin_sim.experiments.ramsey import RamseyResult
    from spin_sim.experiments.rb import RBResult


# --------------------------------------------------------------------------- #
# Charge stability diagram
# --------------------------------------------------------------------------- #

def plot_charge_stability(
    result: StabilityDiagramResult,
    *,
    figsize: tuple[float, float] = (8, 7),
    cmap: str | None = None,
) -> Figure:
    """Plot a 2D charge stability diagram with labelled charge regions."""
    label = result.total_charge_label
    unique_labels = np.unique(label)
    n_labels = len(unique_labels)

    # Map labels to integers 0..N-1 for colormap
    label_to_int = {lbl: i for i, lbl in enumerate(sorted(unique_labels))}
    mapped = np.vectorize(label_to_int.get)(label)

    if cmap is None:
        base_cmap = plt.cm.get_cmap("tab20", n_labels)
        colours = [base_cmap(i) for i in range(n_labels)]
        cmap_obj = ListedColormap(colours)
    else:
        cmap_obj = cmap

    fig, ax = plt.subplots(figsize=figsize)
    im = ax.pcolormesh(
        result.voltages_x,
        result.voltages_y,
        mapped,
        cmap=cmap_obj,
        shading="auto",
    )

    # Label each region at its centroid
    for lbl, idx in label_to_int.items():
        mask = mapped == idx
        if mask.sum() < 4:
            continue
        ys, xs = np.where(mask)
        cy = result.voltages_y[int(ys.mean())]
        cx = result.voltages_x[int(xs.mean())]
        # Format label: e.g. 111 → (1,1,1)
        digits = str(lbl)
        text = "(" + ",".join(digits) + ")"
        ax.text(
            cx, cy, text,
            ha="center", va="center",
            fontsize=8, fontweight="bold",
            color="white",
            bbox=dict(boxstyle="round,pad=0.15", fc="black", alpha=0.5),
        )

    ax.set_xlabel(f"{result.gate_x} (V)")
    ax.set_ylabel(f"{result.gate_y} (V)")
    ax.set_title("Charge Stability Diagram")
    fig.tight_layout()
    return fig


# --------------------------------------------------------------------------- #
# Rabi oscillations
# --------------------------------------------------------------------------- #

def plot_rabi(
    *results: RabiResult,
    labels: list[str] | None = None,
    figsize: tuple[float, float] = (10, 5),
) -> Figure:
    fig, ax = plt.subplots(figsize=figsize)

    for i, r in enumerate(results):
        lbl = labels[i] if labels else f"Q{r.qubit}"
        ax.plot(r.durations_ns, r.p_excited, "o", markersize=2, alpha=0.6, label=lbl)
        if r.fit_curve is not None:
            info = f"Ω={r.fit_frequency_mhz:.1f} MHz" if r.fit_frequency_mhz else ""
            if r.fit_pi_time_ns:
                info += f", π={r.fit_pi_time_ns:.1f} ns"
            ax.plot(r.durations_ns, r.fit_curve, "-", linewidth=1.5, label=f"Fit ({info})")

    ax.set_xlabel("Drive duration (ns)")
    ax.set_ylabel("P(|1⟩)")
    ax.set_ylim(-0.05, 1.05)
    ax.set_title("Rabi Oscillations")
    ax.legend()
    fig.tight_layout()
    return fig


# --------------------------------------------------------------------------- #
# Ramsey fringes
# --------------------------------------------------------------------------- #

def plot_ramsey(
    *results: RamseyResult,
    labels: list[str] | None = None,
    figsize: tuple[float, float] = (10, 5),
) -> Figure:
    fig, ax = plt.subplots(figsize=figsize)

    for i, r in enumerate(results):
        lbl = labels[i] if labels else f"Q{r.qubit}"
        ax.plot(r.delays_ns / 1000, r.p_excited, "o", markersize=2, alpha=0.6, label=lbl)
        if r.fit_curve is not None:
            info = ""
            if r.fit_detuning_mhz:
                info += f"Δ={r.fit_detuning_mhz:.2f} MHz"
            if r.fit_t2_star_us:
                info += f", T₂*={r.fit_t2_star_us:.1f} μs"
            ax.plot(
                r.delays_ns / 1000, r.fit_curve, "-",
                linewidth=1.5, label=f"Fit ({info})",
            )

    ax.set_xlabel("Delay (μs)")
    ax.set_ylabel("P(|1⟩)")
    ax.set_ylim(-0.05, 1.05)
    ax.set_title("Ramsey Fringes")
    ax.legend()
    fig.tight_layout()
    return fig


# --------------------------------------------------------------------------- #
# Randomized benchmarking
# --------------------------------------------------------------------------- #

def plot_rb(
    *results: RBResult,
    labels: list[str] | None = None,
    figsize: tuple[float, float] = (10, 5),
) -> Figure:
    fig, ax = plt.subplots(figsize=figsize)

    for i, r in enumerate(results):
        lbl = labels[i] if labels else f"Q{r.qubit}"
        ax.errorbar(
            r.clifford_depths, r.p_return, yerr=r.p_return_std,
            fmt="o", markersize=4, capsize=2, label=lbl,
        )
        if r.fit_curve is not None:
            info = ""
            if r.fit_fidelity is not None:
                info += f"F={r.fit_fidelity*100:.2f}%"
            if r.fit_epg is not None:
                info += f", EPG={r.fit_epg:.2e}"
            # Smooth fit curve for display
            x_smooth = np.linspace(
                r.clifford_depths[0], r.clifford_depths[-1], 200
            )
            if r.fit_a is not None:
                y_smooth = r.fit_a * r.fit_c ** x_smooth + r.fit_b
                ax.plot(x_smooth, y_smooth, "-", linewidth=1.5, label=f"Fit ({info})")

    ax.set_xscale("log")
    ax.set_xlabel("Clifford Depth")
    ax.set_ylabel("P(return to |0⟩)")
    ax.set_ylim(-0.05, 1.05)
    ax.set_title("Randomized Benchmarking")
    ax.legend()
    fig.tight_layout()
    return fig
