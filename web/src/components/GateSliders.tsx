import React from "react";

interface Props {
  voltages: Record<string, number>;
  onChange: (gate: string, value: number) => void;
  selectedGates: [string, string];
  onSelectGate: (gate: string) => void;
}

const GATES = ["P1", "B12", "P2", "B23", "P3"];
const RANGES: Record<string, [number, number]> = {
  P1: [-0.1, 0.5],
  B12: [-0.1, 0.5],
  P2: [-0.1, 0.5],
  B23: [-0.1, 0.5],
  P3: [-0.1, 0.5],
};

export default function GateSliders({
  voltages,
  onChange,
  selectedGates,
  onSelectGate,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 8px" }}>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>
        Tap gate name to select sweep axis
      </div>
      {GATES.map((gate) => {
        const [min, max] = RANGES[gate];
        const v = voltages[gate] ?? 0.15;
        const isSelected = selectedGates.includes(gate);
        return (
          <div key={gate} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => onSelectGate(gate)}
              style={{
                width: 42,
                padding: "2px 4px",
                fontSize: 12,
                fontWeight: isSelected ? 700 : 400,
                color: isSelected ? "#4ecdc4" : "#ccc",
                background: isSelected ? "rgba(78,205,196,0.15)" : "transparent",
                border: isSelected ? "1px solid #4ecdc4" : "1px solid #555",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {gate}
            </button>
            <input
              type="range"
              min={min}
              max={max}
              step={0.005}
              value={v}
              onChange={(e) => onChange(gate, parseFloat(e.target.value))}
              disabled={isSelected}
              style={{ flex: 1, accentColor: isSelected ? "#4ecdc4" : "#e76f51" }}
            />
            <span style={{ width: 52, fontSize: 12, color: "#ccc", textAlign: "right" }}>
              {v.toFixed(3)}V
            </span>
          </div>
        );
      })}
    </div>
  );
}
