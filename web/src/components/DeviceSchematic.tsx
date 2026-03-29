import React from "react";

interface Props {
  voltages: Record<string, number>;
  selectedGates: [string, string];
}

const GATE_POSITIONS: Record<string, { x: number; label: string; isBarrier: boolean }> = {
  P1:  { x: 40,  label: "P1",  isBarrier: false },
  B12: { x: 100, label: "B12", isBarrier: true },
  P2:  { x: 160, label: "P2",  isBarrier: false },
  B23: { x: 220, label: "B23", isBarrier: true },
  P3:  { x: 280, label: "P3",  isBarrier: false },
};

const DOT_Y = 50;
const DOT_R = 22;
const BARRIER_W = 16;
const BARRIER_H = 28;

export default function DeviceSchematic({ voltages, selectedGates }: Props) {
  return (
    <svg viewBox="0 0 320 120" style={{ width: "100%", maxWidth: 400 }}>
      {/* Connection lines between dots */}
      <line x1={62} y1={DOT_Y} x2={138} y2={DOT_Y} stroke="#555" strokeWidth={3} />
      <line x1={182} y1={DOT_Y} x2={258} y2={DOT_Y} stroke="#555" strokeWidth={3} />

      {Object.entries(GATE_POSITIONS).map(([name, { x, label, isBarrier }]) => {
        const isSelected = selectedGates.includes(name);
        const v = voltages[name] ?? 0;

        if (isBarrier) {
          return (
            <g key={name}>
              <rect
                x={x - BARRIER_W / 2}
                y={DOT_Y - BARRIER_H / 2}
                width={BARRIER_W}
                height={BARRIER_H}
                rx={3}
                fill={isSelected ? "#4ecdc4" : "#666"}
                stroke={isSelected ? "#fff" : "#888"}
                strokeWidth={isSelected ? 2 : 1}
              />
              <text x={x} y={DOT_Y + BARRIER_H / 2 + 16} textAnchor="middle" fontSize={11} fill="#aaa">
                {label}
              </text>
              <text x={x} y={DOT_Y + BARRIER_H / 2 + 30} textAnchor="middle" fontSize={9} fill="#888">
                {v.toFixed(2)}V
              </text>
            </g>
          );
        }

        return (
          <g key={name}>
            <circle
              cx={x}
              cy={DOT_Y}
              r={DOT_R}
              fill={isSelected ? "#e76f51" : "#264653"}
              stroke={isSelected ? "#fff" : "#2a9d8f"}
              strokeWidth={isSelected ? 2.5 : 2}
            />
            {/* Electron dot */}
            <circle cx={x} cy={DOT_Y} r={4} fill="#f4a261" />
            <text x={x} y={DOT_Y + DOT_R + 16} textAnchor="middle" fontSize={11} fill="#aaa">
              {label}
            </text>
            <text x={x} y={DOT_Y + DOT_R + 30} textAnchor="middle" fontSize={9} fill="#888">
              {v.toFixed(2)}V
            </text>
          </g>
        );
      })}

      {/* Title */}
      <text x={160} y={12} textAnchor="middle" fontSize={10} fill="#666">
        1×3 Quantum Dot Array
      </text>
    </svg>
  );
}
