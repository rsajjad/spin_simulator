import React, { useEffect, useRef } from "react";

const GATE_ORDER = ["P1", "B12", "P2", "B23", "P3"];

// Spatial positions matching DeviceSchematic x-coordinates (40–280 range, normalised to 0–1)
const GATE_X = [40, 100, 160, 220, 280];
const X_MIN = GATE_X[0];
const X_MAX = GATE_X[GATE_X.length - 1];

interface Props {
  voltages: Record<string, number>;
}

/**
 * Sum of Gaussian potentials centered at each gate electrode.
 * Each gate contributes a localized well/barrier so that changing
 * one gate doesn't affect distant regions.
 */
function interpolateEnergy(voltages: Record<string, number>, nPoints: number): number[] {
  const xs = GATE_X.map((x) => (x - X_MIN) / (X_MAX - X_MIN));
  const vals = GATE_ORDER.map((g) => -(voltages[g] ?? 0));
  // Narrower sigma for barriers, wider for plungers
  const sigmas = GATE_ORDER.map((g) => (g.startsWith("B") ? 0.08 : 0.12));

  const out: number[] = [];
  for (let i = 0; i < nPoints; i++) {
    const t = i / (nPoints - 1);
    let v = 0;
    for (let gi = 0; gi < GATE_ORDER.length; gi++) {
      const dx = t - xs[gi];
      v += vals[gi] * Math.exp(-(dx * dx) / (2 * sigmas[gi] * sigmas[gi]));
    }
    out.push(v);
  }
  return out;
}

export default function EnergyTrace({ voltages }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = 400;
    const H = 140;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    const nPoints = W;
    const energy = interpolateEnergy(voltages, nPoints);

    // Fixed y-axis range based on slider limits (0 to 0.5 V → energy -0.5 to 0)
    const eMin = -0.55;
    const eMax = 0.05;
    const range = eMax - eMin;
    const pad = 8;

    // Draw energy curve
    ctx.beginPath();
    for (let i = 0; i < nPoints; i++) {
      const x = i;
      const y = pad + ((energy[i] - eMin) / range) * (H - 2 * pad);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#4ecdc4";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill below the curve
    ctx.lineTo(W - 1, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = "rgba(78, 205, 196, 0.1)";
    ctx.fill();

    // Mark gate positions with dots
    for (let gi = 0; gi < GATE_ORDER.length; gi++) {
      const frac = (GATE_X[gi] - X_MIN) / (X_MAX - X_MIN);
      const px = frac * (W - 1);
      const v = -(voltages[GATE_ORDER[gi]] ?? 0);
      const py = pad + ((v - eMin) / range) * (H - 2 * pad);

      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = GATE_ORDER[gi].startsWith("B") ? "#888" : "#f4a261";
      ctx.fill();
    }

    // Axis label
    ctx.fillStyle = "#666";
    ctx.font = "9px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("Energy", 4, 10);
  }, [voltages]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        maxWidth: 400,
        height: 100,
        borderRadius: 6,
        border: "1px solid #333",
      }}
    />
  );
}
