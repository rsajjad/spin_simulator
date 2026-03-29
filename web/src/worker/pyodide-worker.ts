/**
 * Pyodide web worker: loads the spin_sim Python package and runs simulations
 * off the main thread. Communicates via postMessage with typed messages.
 */
/// <reference lib="WebWorker" />
import type { SimRequest, SimResult } from "./types";

declare const self: DedicatedWorkerGlobalScope & typeof globalThis;
declare function importScripts(...urls: string[]): void;

// Pyodide globals
let pyodide: any = null;

async function initPyodide() {
  // Load Pyodide from CDN
  importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js");
  pyodide = await (self as any).loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/",
  });
  await pyodide.loadPackage(["numpy", "scipy"]);

  // Load the spin_sim Python source files into Pyodide's filesystem
  const modules: Record<string, string> = {};
  const pyFiles = import.meta.glob("/src/python/**/*.py", {
    eager: true,
    query: "?raw",
    import: "default",
  }) as Record<string, string>;

  // Write files to Pyodide FS
  pyodide.FS.mkdirTree("/home/pyodide/spin_sim/experiments");
  for (const [path, content] of Object.entries(pyFiles)) {
    // path like /src/python/spin_sim/__init__.py
    const relPath = path.replace("/src/python/", "/home/pyodide/");
    pyodide.FS.writeFile(relPath, content);
  }

  // Add to sys.path
  pyodide.runPython(`
import sys
sys.path.insert(0, "/home/pyodide")
`);

  const msg: SimResult = { type: "ready" };
  self.postMessage(msg);
}

function runStability(req: SimRequest & { type: "stability" }): SimResult {
  const result = pyodide.runPython(`
import numpy as np
import json
from spin_sim import QuantumDotArray
from spin_sim.experiments import charge_stability

device = QuantumDotArray.default_1x3()
base = ${JSON.stringify(req.baseVoltages)}
result = charge_stability.run(
    device,
    gate_x="${req.gateX}",
    gate_y="${req.gateY}",
    v_range_x=(${req.vRangeX[0]}, ${req.vRangeX[1]}),
    v_range_y=(${req.vRangeY[0]}, ${req.vRangeY[1]}),
    n_points=${req.nPoints},
    base_voltages=base,
)
json.dumps({
    "labels": result.total_charge_label.tolist(),
    "voltagesX": result.voltages_x.tolist(),
    "voltagesY": result.voltages_y.tolist(),
})
`);
  const parsed = JSON.parse(result);
  return { type: "stability", ...parsed };
}

function runRabi(req: SimRequest & { type: "rabi" }): SimResult {
  const durJson = JSON.stringify(req.durationsNs);
  const result = pyodide.runPython(`
import numpy as np
import json
from spin_sim import QuantumDotArray
from spin_sim.experiments import rabi

device = QuantumDotArray.default_1x3()
result = rabi.run(
    device,
    qubit=${req.qubit},
    drive_frequency_ghz=${req.freqGHz},
    drive_amplitude_mhz=${req.ampMHz},
    durations_ns=np.array(${durJson}),
    shot_count=${req.shotCount},
    seed=42,
)
json.dumps({
    "durationsNs": result.durations_ns.tolist(),
    "pExcited": result.p_excited.tolist(),
    "fitCurve": result.fit_curve.tolist() if result.fit_curve is not None else None,
    "fitFreqMHz": result.fit_frequency_mhz,
    "piTimeNs": result.fit_pi_time_ns,
})
`);
  const parsed = JSON.parse(result);
  return { type: "rabi", ...parsed };
}

function runRamsey(req: SimRequest & { type: "ramsey" }): SimResult {
  const delaysJson = JSON.stringify(req.delaysNs);
  const result = pyodide.runPython(`
import numpy as np
import json
from spin_sim import QuantumDotArray
from spin_sim.experiments import ramsey

device = QuantumDotArray.default_1x3()
result = ramsey.run(
    device,
    qubit=${req.qubit},
    drive_frequency_ghz=${req.freqGHz},
    delays_ns=np.array(${delaysJson}),
    shot_count=${req.shotCount},
    seed=42,
)
json.dumps({
    "delaysNs": result.delays_ns.tolist(),
    "pExcited": result.p_excited.tolist(),
    "fitCurve": result.fit_curve.tolist() if result.fit_curve is not None else None,
    "detMHz": result.fit_detuning_mhz,
    "t2StarUs": result.fit_t2_star_us,
})
`);
  const parsed = JSON.parse(result);
  return { type: "ramsey", ...parsed };
}

function runRB(req: SimRequest & { type: "rb" }): SimResult {
  const depthsJson = JSON.stringify(req.depths);
  const result = pyodide.runPython(`
import numpy as np
import json
from spin_sim import QuantumDotArray
from spin_sim.experiments import rb

device = QuantumDotArray.default_1x3()
result = rb.run(
    device,
    qubit=${req.qubit},
    clifford_depths=${depthsJson},
    sequence_count=${req.seqCount},
    shot_count=${req.shotCount},
    seed=42,
)
json.dumps({
    "depths": result.clifford_depths.tolist(),
    "pReturn": result.p_return.tolist(),
    "pReturnStd": result.p_return_std.tolist(),
    "fitCurve": result.fit_curve.tolist() if result.fit_curve is not None else None,
    "fidelity": result.fit_fidelity,
    "epg": result.fit_epg,
})
`);
  const parsed = JSON.parse(result);
  return { type: "rb", ...parsed };
}

self.onmessage = async (event: MessageEvent<SimRequest>) => {
  if (!pyodide) {
    await initPyodide();
  }
  const req = event.data;
  try {
    let result: SimResult;
    switch (req.type) {
      case "stability":
        result = runStability(req);
        break;
      case "rabi":
        result = runRabi(req);
        break;
      case "ramsey":
        result = runRamsey(req);
        break;
      case "rb":
        result = runRB(req);
        break;
    }
    self.postMessage(result);
  } catch (e: any) {
    const msg: SimResult = { type: "error", message: e.message || String(e) };
    self.postMessage(msg);
  }
};

// Start loading Pyodide immediately
initPyodide();
