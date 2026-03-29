import React, { useState } from "react";
import type { SimRequest } from "../worker/types";

interface Props {
  onRun: (req: SimRequest) => void;
  loading: boolean;
}

const QUBIT_FREQS = [4.95, 5.0, 5.05];

export default function ExperimentPanel({ onRun, loading }: Props) {
  const [qubit, setQubit] = useState(1);
  // Rabi params
  const [rabiFreq, setRabiFreq] = useState(QUBIT_FREQS[1]);
  const [rabiAmp, setRabiAmp] = useState(10);
  const [rabiMaxDur, setRabiMaxDur] = useState(500);
  // Ramsey params
  const [ramseyFreq, setRamseyFreq] = useState(5.002);
  const [ramseyMaxDelay, setRamseyMaxDelay] = useState(5000);
  // RB params
  const [rbSeqCount, setRbSeqCount] = useState(30);
  const [rbShotCount, setRbShotCount] = useState(256);

  const freq = QUBIT_FREQS[qubit];

  const runRabi = () => {
    const n = 100;
    const durations = Array.from({ length: n }, (_, i) => (i * rabiMaxDur) / (n - 1));
    onRun({
      type: "rabi",
      qubit,
      freqGHz: rabiFreq,
      ampMHz: rabiAmp,
      durationsNs: durations,
      shotCount: 256,
    });
  };

  const runRamsey = () => {
    const n = 150;
    const delays = Array.from({ length: n }, (_, i) => (i * ramseyMaxDelay) / (n - 1));
    onRun({
      type: "ramsey",
      qubit,
      freqGHz: ramseyFreq,
      delaysNs: delays,
      shotCount: 256,
    });
  };

  const runRB = () => {
    onRun({
      type: "rb",
      qubit,
      depths: [1, 2, 5, 10, 20, 50, 100, 200, 500],
      seqCount: rbSeqCount,
      shotCount: rbShotCount,
    });
  };

  const sectionStyle: React.CSSProperties = {
    padding: "10px 12px",
    background: "#16213e",
    borderRadius: 8,
    marginBottom: 10,
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: "#888", display: "block", marginBottom: 2 };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "4px 6px",
    background: "#0f3460",
    color: "#ccc",
    border: "1px solid #333",
    borderRadius: 4,
    fontSize: 13,
  };
  const btnStyle: React.CSSProperties = {
    padding: "8px 16px",
    background: "#e76f51",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    opacity: loading ? 0.5 : 1,
    width: "100%",
    marginTop: 8,
  };

  return (
    <div>
      {/* Qubit selector */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Target Qubit</label>
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((q) => (
            <button
              key={q}
              onClick={() => { setQubit(q); setRabiFreq(QUBIT_FREQS[q]); }}
              style={{
                flex: 1,
                padding: "6px",
                fontSize: 12,
                background: qubit === q ? "#e76f51" : "#0f3460",
                color: "#fff",
                border: qubit === q ? "1px solid #fff" : "1px solid #333",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Q{q} ({QUBIT_FREQS[q]} GHz)
            </button>
          ))}
        </div>
      </div>

      {/* Rabi */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 13, color: "#4ecdc4", fontWeight: 600, marginBottom: 6 }}>Rabi</div>
        <label style={labelStyle}>Drive freq (GHz)</label>
        <input type="number" step={0.001} value={rabiFreq} onChange={(e) => setRabiFreq(+e.target.value)} style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 6 }}>Amplitude (MHz)</label>
        <input type="number" step={1} value={rabiAmp} onChange={(e) => setRabiAmp(+e.target.value)} style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 6 }}>Max duration (ns)</label>
        <input type="number" step={50} value={rabiMaxDur} onChange={(e) => setRabiMaxDur(+e.target.value)} style={inputStyle} />
        <button onClick={runRabi} disabled={loading} style={btnStyle}>Run Rabi</button>
      </div>

      {/* Ramsey */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 13, color: "#4ecdc4", fontWeight: 600, marginBottom: 6 }}>Ramsey</div>
        <label style={labelStyle}>Drive freq (GHz)</label>
        <input type="number" step={0.001} value={ramseyFreq} onChange={(e) => setRamseyFreq(+e.target.value)} style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 6 }}>Max delay (ns)</label>
        <input type="number" step={500} value={ramseyMaxDelay} onChange={(e) => setRamseyMaxDelay(+e.target.value)} style={inputStyle} />
        <button onClick={runRamsey} disabled={loading} style={btnStyle}>Run Ramsey</button>
      </div>

      {/* RB */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 13, color: "#4ecdc4", fontWeight: 600, marginBottom: 6 }}>Randomized Benchmarking</div>
        <label style={labelStyle}>Sequences per depth</label>
        <input type="number" step={5} value={rbSeqCount} onChange={(e) => setRbSeqCount(+e.target.value)} style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 6 }}>Shots per sequence</label>
        <input type="number" step={64} value={rbShotCount} onChange={(e) => setRbShotCount(+e.target.value)} style={inputStyle} />
        <button onClick={runRB} disabled={loading} style={btnStyle}>Run RB</button>
      </div>
    </div>
  );
}
