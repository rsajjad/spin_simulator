---
description: "Use when working on the PWA web app, Pyodide worker, React components, or Vite build config. Covers the browser-based simulator UI."
applyTo: "web/**"
---

# Spin Simulator Web App

## Stack
- Vite 6 + React 19 + TypeScript 5.6
- Pyodide v0.27.5 (WASM Python) in a Web Worker
- Canvas API for heatmaps, Chart.js-style canvas plots
- PWA: service worker + manifest for installable offline app

## Architecture
- `worker/pyodide-worker.ts` — module worker, loads Pyodide via ESM dynamic import (`import()`, NOT `importScripts`)
- `worker/types.ts` — typed message API (SimRequest/SimResult discriminated unions)
- `hooks/useSimulator.ts` — React hook wrapping the worker with ready/loading state
- `components/` — DeviceSchematic (SVG), GateSliders, StabilityMap (canvas), ExperimentPanel, PlotCanvas
- `src/python/` — copy of spin_sim source, loaded into Pyodide FS at init via `import.meta.glob`

## Key rules
- The worker is `{ type: "module" }` — never use `importScripts()`
- Python files are collected at build time with `import.meta.glob("/src/python/**/*.py", { eager: true, query: "?raw", import: "default" })`
- Worker and main app have separate tsconfigs (DOM vs WebWorker libs)
- The stability map renders at display resolution (400×400) with an offscreen canvas for the pixelated heatmap and crisp text overlay
- Vite base path is `/spin_simulator/` for GitHub Pages deployment
