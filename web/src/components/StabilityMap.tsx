import React, { useEffect, useRef } from "react";
import type { StabilityResult } from "../worker/types";

// Color palette for charge configurations
const COLORS: Record<number, string> = {
  300: "#264653", 210: "#2a9d8f", 201: "#e9c46a",
  120: "#f4a261", 111: "#e76f51", 102: "#a8dadc",
  30:  "#457b9d", 21:  "#1d3557", 12:  "#606c38",
  3:   "#283618", 0:   "#000000",
};

function labelColor(label: number): string {
  return COLORS[label] || `hsl(${(label * 37) % 360}, 60%, 50%)`;
}

interface Props {
  result: StabilityResult | null;
  loading: boolean;
  gateX: string;
  gateY: string;
}

export default function StabilityMap({ result, loading, gateX, gateY }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;

    const ctx = canvas.getContext("2d")!;
    const { labels, voltagesX, voltagesY } = result;
    const ny = labels.length;
    const nx = labels[0].length;

    // Layout: margins for axes, plot area in the center
    const marginLeft = 44;
    const marginBottom = 32;
    const marginTop = 8;
    const marginRight = 8;
    const totalW = 400;
    const totalH = 400;
    const plotW = totalW - marginLeft - marginRight;
    const plotH = totalH - marginTop - marginBottom;

    canvas.width = totalW;
    canvas.height = totalH;

    // Clear
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, totalW, totalH);

    // Draw heatmap onto an offscreen canvas at grid resolution
    const offscreen = document.createElement("canvas");
    offscreen.width = nx;
    offscreen.height = ny;
    const offCtx = offscreen.getContext("2d")!;
    const imageData = offCtx.createImageData(nx, ny);

    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const label = labels[iy][ix];
        const color = labelColor(label);

        const r = parseInt(color.slice(1, 3), 16) || 0;
        const g = parseInt(color.slice(3, 5), 16) || 0;
        const b = parseInt(color.slice(5, 7), 16) || 0;

        // Flip y so (0,0) is bottom-left
        const py = ny - 1 - iy;
        const idx = (py * nx + ix) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }
    offCtx.putImageData(imageData, 0, 0);

    // Scale heatmap into the plot area
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, marginLeft, marginTop, plotW, plotH);

    // Draw charge config labels at centroids
    const centroids: Record<number, { sx: number; sy: number; count: number }> = {};
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const label = labels[iy][ix];
        if (!centroids[label]) centroids[label] = { sx: 0, sy: 0, count: 0 };
        centroids[label].sx += ix;
        centroids[label].sy += (ny - 1 - iy);
        centroids[label].count++;
      }
    }

    const scaleX = plotW / nx;
    const scaleY = plotH / ny;
    const fontSize = Math.max(7, plotW / 54) * 1.3;
    ctx.imageSmoothingEnabled = true;
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const [labelStr, { sx, sy, count }] of Object.entries(centroids)) {
      if (count < 4) continue;
      const cx = marginLeft + (sx / count) * scaleX;
      const cy = marginTop + (sy / count) * scaleY;
      const digits = String(labelStr).padStart(3, "0");
      const text = `(${digits.split("").join(",")})`;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      const tw = ctx.measureText(text).width;
      ctx.fillRect(cx - tw / 2 - 2, cy - fontSize / 2 - 1, tw + 4, fontSize + 2);
      ctx.fillStyle = "#fff";
      ctx.fillText(text, cx, cy);
    }

    // --- Draw axes ---
    const vxMin = voltagesX[0];
    const vxMax = voltagesX[voltagesX.length - 1];
    const vyMin = voltagesY[0];
    const vyMax = voltagesY[voltagesY.length - 1];

    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;

    // X axis ticks and labels
    const nTicks = 5;
    ctx.font = "10px system-ui";
    ctx.fillStyle = "#999";
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    for (let i = 0; i <= nTicks; i++) {
      const frac = i / nTicks;
      const px = marginLeft + frac * plotW;
      const val = vxMin + frac * (vxMax - vxMin);
      ctx.beginPath();
      ctx.moveTo(px, marginTop + plotH);
      ctx.lineTo(px, marginTop + plotH + 4);
      ctx.stroke();
      ctx.fillText(val.toFixed(2), px, marginTop + plotH + 6);
    }

    // X axis label
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#aaa";
    ctx.fillText(`${gateX} (V)`, marginLeft + plotW / 2, totalH - 4);

    // Y axis ticks and labels
    ctx.font = "10px system-ui";
    ctx.fillStyle = "#999";
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    for (let i = 0; i <= nTicks; i++) {
      const frac = i / nTicks;
      const py = marginTop + plotH - frac * plotH;
      const val = vyMin + frac * (vyMax - vyMin);
      ctx.beginPath();
      ctx.moveTo(marginLeft, py);
      ctx.lineTo(marginLeft - 4, py);
      ctx.stroke();
      ctx.fillText(val.toFixed(2), marginLeft - 6, py);
    }

    // Y axis label (rotated)
    ctx.save();
    ctx.translate(10, marginTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#aaa";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${gateY} (V)`, 0, 0);
    ctx.restore();

  }, [result, gateX, gateY]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          aspectRatio: "1",
          borderRadius: 8,
          border: "1px solid #333",
        }}
      />
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            borderRadius: 8,
            color: "#4ecdc4",
            fontSize: 14,
          }}
        >
          Computing...
        </div>
      )}
    </div>
  );
}
