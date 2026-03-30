import React, { useCallback, useEffect, useRef, useState } from "react";
import DeviceSchematic from "./components/DeviceSchematic";
import EnergyTrace from "./components/EnergyTrace";
import GateSliders from "./components/GateSliders";
import StabilityMap from "./components/StabilityMap";
import ExperimentPanel from "./components/ExperimentPanel";
import { RabiPlot, RamseyPlot, RBPlot } from "./components/PlotCanvas";
import { useSimulator } from "./hooks/useSimulator";
import type {
  SimRequest,
  StabilityResult,
  RabiResult,
  RamseyResult,
  RBResult,
} from "./worker/types";

type Tab = "charge" | "experiments";

const INITIAL_VOLTAGES: Record<string, number> = {
  P1: 0.15,
  B12: 0.15,
  P2: 0.15,
  B23: 0.15,
  P3: 0.15,
};

export default function App() {
  const { ready, loading, run } = useSimulator();

  const [tab, setTab] = useState<Tab>("charge");
  const [voltages, setVoltages] = useState(INITIAL_VOLTAGES);
  const [selectedGates, setSelectedGates] = useState<[string, string]>(["P1", "P2"]);
  const [stabilityResult, setStabilityResult] = useState<StabilityResult | null>(null);
  const [rabiResult, setRabiResult] = useState<RabiResult | null>(null);
  const [ramseyResult, setRamseyResult] = useState<RamseyResult | null>(null);
  const [rbResult, setRBResult] = useState<RBResult | null>(null);
  const [csdLoading, setCsdLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Run stability diagram
  const runStability = useCallback(
    async (nPoints = 100) => {
      if (!ready) return;
      setCsdLoading(true);
      const base: Record<string, number> = {};
      for (const [k, v] of Object.entries(voltages)) {
        if (!selectedGates.includes(k)) base[k] = v;
      }
      const result = await run({
        type: "stability",
        gateX: selectedGates[0],
        gateY: selectedGates[1],
        baseVoltages: base,
        nPoints,
        vRangeX: [-0.05, 0.35],
        vRangeY: [-0.05, 0.35],
      });
      if (result.type === "stability") {
        setStabilityResult(result);
      }
      setCsdLoading(false);
    },
    [ready, run, voltages, selectedGates],
  );

  // Auto-run stability on gate or voltage change
  useEffect(() => {
    if (!ready || tab !== "charge") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runStability(80), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [ready, voltages, selectedGates, tab, runStability]);

  // Initial load
  useEffect(() => {
    if (ready) runStability(100);
  }, [ready]);

  const handleVoltageChange = (gate: string, value: number) => {
    setVoltages((prev) => ({ ...prev, [gate]: value }));
  };

  const handleSelectGate = (gate: string) => {
    setSelectedGates((prev) => {
      if (prev.includes(gate)) return prev;
      return [prev[1], gate];
    });
  };

  const handleExperimentRun = async (req: SimRequest) => {
    const result = await run(req);
    switch (result.type) {
      case "rabi":
        setRabiResult(result);
        break;
      case "ramsey":
        setRamseyResult(result);
        break;
      case "rb":
        setRBResult(result);
        break;
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "charge", label: "Charge" },
    { key: "experiments", label: "Experiments" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a2e",
        color: "#eee",
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: 480,
        margin: "0 auto",
        padding: "env(safe-area-inset-top) 12px env(safe-area-inset-bottom) 12px",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
        <h1 style={{ fontSize: 18, margin: 0, color: "#4ecdc4" }}>Spin Qubit Simulator</h1>
        <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
          {ready ? "1×3 Quantum Dot Array" : "Loading Pyodide..."}
        </div>
      </div>

      {/* Device schematic */}
      <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
        <DeviceSchematic voltages={voltages} selectedGates={selectedGates} />
      </div>

      {/* 1D energy landscape */}
      <div style={{ display: "flex", justifyContent: "center", padding: "0 0 4px" }}>
        <EnergyTrace voltages={voltages} />
      </div>

      {/* Gate sliders */}
      <GateSliders
        voltages={voltages}
        onChange={handleVoltageChange}
        selectedGates={selectedGates}
        onSelectGate={handleSelectGate}
      />

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "12px 0 8px",
          borderBottom: "1px solid #333",
          marginBottom: 10,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 13,
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? "#4ecdc4" : "#888",
              background: tab === t.key ? "rgba(78,205,196,0.1)" : "transparent",
              border: tab === t.key ? "1px solid #4ecdc4" : "1px solid #333",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "charge" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <StabilityMap
            result={stabilityResult}
            loading={csdLoading}
            gateX={selectedGates[0]}
            gateY={selectedGates[1]}
          />
        </div>
      )}

      {tab === "experiments" && (
        <div>
          <ExperimentPanel onRun={handleExperimentRun} loading={loading} />
          {rabiResult && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: "#4ecdc4", marginBottom: 4 }}>Rabi</div>
              <RabiPlot result={rabiResult} />
            </div>
          )}
          {ramseyResult && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: "#4ecdc4", marginBottom: 4 }}>Ramsey</div>
              <RamseyPlot result={ramseyResult} />
            </div>
          )}
          {rbResult && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: "#4ecdc4", marginBottom: 4 }}>Randomized Benchmarking</div>
              <RBPlot result={rbResult} />
            </div>
          )}
        </div>
      )}

      {/* Loading overlay for experiments */}
      {loading && tab !== "charge" && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#16213e",
            color: "#4ecdc4",
            padding: "8px 20px",
            borderRadius: 20,
            fontSize: 13,
            border: "1px solid #4ecdc4",
            zIndex: 10,
          }}
        >
          Running simulation...
        </div>
      )}
    </div>
  );
}
