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

    canvas.width = nx;
    canvas.height = ny;

    const imageData = ctx.createImageData(nx, ny);

    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const label = labels[iy][ix];
        const color = labelColor(label);

        // Parse hex color
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
    ctx.putImageData(imageData, 0, 0);

    // Draw labels at centroids
    // First collect centroids for each unique label
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

    ctx.font = `${Math.max(8, nx / 18)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const [labelStr, { sx, sy, count }] of Object.entries(centroids)) {
      if (count < 4) continue;
      const cx = sx / count;
      const cy = sy / count;
      const digits = String(labelStr);
      const text = `(${digits.split("").join(",")})`;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      const tw = ctx.measureText(text).width;
      ctx.fillRect(cx - tw / 2 - 2, cy - 6, tw + 4, 12);
      ctx.fillStyle = "#fff";
      ctx.fillText(text, cx, cy);
    }
  }, [result]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          aspectRatio: "1",
          imageRendering: "pixelated",
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
      {result && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 2px", fontSize: 11, color: "#888" }}>
          <span>{gateX} →</span>
          <span>↑ {gateY}</span>
        </div>
      )}
    </div>
  );
}
