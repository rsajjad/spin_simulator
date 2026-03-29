import React, { useRef, useEffect } from "react";
import type { RabiResult, RamseyResult, RBResult } from "../worker/types";

interface DataPoint {
  x: number;
  y: number;
}

interface PlotProps {
  data: DataPoint[];
  fitData?: DataPoint[] | null;
  xLabel: string;
  yLabel: string;
  title: string;
  logX?: boolean;
  errorBars?: number[];
}

export default function PlotCanvas({
  data,
  fitData,
  xLabel,
  yLabel,
  title,
  logX = false,
  errorBars,
}: PlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Margins
    const ml = 50, mr = 16, mt = 28, mb = 36;
    const pw = w - ml - mr;
    const ph = h - mt - mb;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Data range
    const allX = data.map((d) => d.x);
    const allY = [...data.map((d) => d.y), ...(fitData ?? []).map((d) => d.y)];
    let xMin = Math.min(...allX);
    let xMax = Math.max(...allX);
    const yMin = Math.min(0, Math.min(...allY) - 0.05);
    const yMax = Math.max(1.05, Math.max(...allY) + 0.05);

    if (logX) {
      xMin = Math.max(0.5, xMin);
      xMax = Math.max(xMin + 1, xMax);
    }

    const mapX = (v: number) => {
      if (logX) {
        return ml + ((Math.log10(v) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin))) * pw;
      }
      return ml + ((v - xMin) / (xMax - xMin)) * pw;
    };
    const mapY = (v: number) => mt + (1 - (v - yMin) / (yMax - yMin)) * ph;

    // Grid
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = mt + (ph * i) / 4;
      ctx.beginPath();
      ctx.moveTo(ml, y);
      ctx.lineTo(ml + pw, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ml, mt);
    ctx.lineTo(ml, mt + ph);
    ctx.lineTo(ml + pw, mt + ph);
    ctx.stroke();

    // Data points
    ctx.fillStyle = "#e76f51";
    for (let i = 0; i < data.length; i++) {
      const px = mapX(data[i].x);
      const py = mapY(data[i].y);
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Error bars
      if (errorBars && errorBars[i]) {
        ctx.strokeStyle = "#e76f51";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, mapY(data[i].y - errorBars[i]));
        ctx.lineTo(px, mapY(data[i].y + errorBars[i]));
        ctx.stroke();
      }
    }

    // Fit curve
    if (fitData && fitData.length > 0) {
      ctx.strokeStyle = "#4ecdc4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < fitData.length; i++) {
        const px = mapX(fitData[i].x);
        const py = mapY(fitData[i].y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Labels
    ctx.fillStyle = "#aaa";
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(xLabel, ml + pw / 2, h - 4);
    ctx.fillText(title, ml + pw / 2, 14);

    ctx.save();
    ctx.translate(12, mt + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    // Tick labels
    ctx.font = "9px system-ui";
    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    const nTicksX = logX ? 5 : 5;
    for (let i = 0; i <= nTicksX; i++) {
      let v: number;
      if (logX) {
        v = xMin * Math.pow(xMax / xMin, i / nTicksX);
      } else {
        v = xMin + (xMax - xMin) * (i / nTicksX);
      }
      const px = mapX(v);
      ctx.fillText(logX ? v.toFixed(0) : v.toFixed(0), px, mt + ph + 14);
    }
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = yMin + (yMax - yMin) * (1 - i / 4);
      ctx.fillText(v.toFixed(2), ml - 4, mt + (ph * i) / 4 + 3);
    }
  }, [data, fitData, xLabel, yLabel, title, logX, errorBars]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: 240,
        borderRadius: 8,
        border: "1px solid #333",
      }}
    />
  );
}

// --- Convenience wrappers for each experiment ---

export function RabiPlot({ result }: { result: RabiResult }) {
  const data = result.durationsNs.map((x, i) => ({ x, y: result.pExcited[i] }));
  const fitData = result.fitCurve
    ? result.durationsNs.map((x, i) => ({ x, y: result.fitCurve![i] }))
    : null;
  return (
    <div>
      <PlotCanvas
        data={data}
        fitData={fitData}
        xLabel="Duration (ns)"
        yLabel="P(|1⟩)"
        title="Rabi Oscillations"
      />
      {result.fitFreqMHz != null && (
        <div style={{ fontSize: 12, color: "#4ecdc4", padding: "4px 0" }}>
          Ω<sub>R</sub> = {result.fitFreqMHz.toFixed(2)} MHz
          {result.piTimeNs != null && ` · π-time = ${result.piTimeNs.toFixed(1)} ns`}
        </div>
      )}
    </div>
  );
}

export function RamseyPlot({ result }: { result: RamseyResult }) {
  const data = result.delaysNs.map((x, i) => ({ x: x / 1000, y: result.pExcited[i] }));
  const fitData = result.fitCurve
    ? result.delaysNs.map((x, i) => ({ x: x / 1000, y: result.fitCurve![i] }))
    : null;
  return (
    <div>
      <PlotCanvas
        data={data}
        fitData={fitData}
        xLabel="Delay (μs)"
        yLabel="P(|1⟩)"
        title="Ramsey Fringes"
      />
      {result.detMHz != null && (
        <div style={{ fontSize: 12, color: "#4ecdc4", padding: "4px 0" }}>
          Δ = {result.detMHz.toFixed(2)} MHz
          {result.t2StarUs != null && ` · T₂* = ${result.t2StarUs.toFixed(1)} μs`}
        </div>
      )}
    </div>
  );
}

export function RBPlot({ result }: { result: RBResult }) {
  const data = result.depths.map((x, i) => ({ x, y: result.pReturn[i] }));
  const fitData = result.fitCurve
    ? result.depths.map((x, i) => ({ x, y: result.fitCurve![i] }))
    : null;
  return (
    <div>
      <PlotCanvas
        data={data}
        fitData={fitData}
        xLabel="Clifford Depth"
        yLabel="P(return)"
        title="Randomized Benchmarking"
        logX
        errorBars={result.pReturnStd}
      />
      {result.fidelity != null && (
        <div style={{ fontSize: 12, color: "#4ecdc4", padding: "4px 0" }}>
          F = {(result.fidelity * 100).toFixed(2)}%
          {result.epg != null && ` · EPG = ${result.epg.toExponential(2)}`}
        </div>
      )}
    </div>
  );
}
