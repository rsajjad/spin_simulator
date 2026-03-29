/** Message types exchanged between the UI thread and the Pyodide web worker. */

export interface StabilityRequest {
  type: "stability";
  gateX: string;
  gateY: string;
  baseVoltages: Record<string, number>;
  nPoints: number;
  vRangeX: [number, number];
  vRangeY: [number, number];
}

export interface RabiRequest {
  type: "rabi";
  qubit: number;
  freqGHz: number;
  ampMHz: number;
  durationsNs: number[];
  shotCount: number;
}

export interface RamseyRequest {
  type: "ramsey";
  qubit: number;
  freqGHz: number;
  delaysNs: number[];
  shotCount: number;
}

export interface RBRequest {
  type: "rb";
  qubit: number;
  depths: number[];
  seqCount: number;
  shotCount: number;
}

export type SimRequest =
  | StabilityRequest
  | RabiRequest
  | RamseyRequest
  | RBRequest;

export interface StabilityResult {
  type: "stability";
  labels: number[][];
  voltagesX: number[];
  voltagesY: number[];
}

export interface RabiResult {
  type: "rabi";
  durationsNs: number[];
  pExcited: number[];
  fitCurve: number[] | null;
  fitFreqMHz: number | null;
  piTimeNs: number | null;
}

export interface RamseyResult {
  type: "ramsey";
  delaysNs: number[];
  pExcited: number[];
  fitCurve: number[] | null;
  detMHz: number | null;
  t2StarUs: number | null;
}

export interface RBResult {
  type: "rb";
  depths: number[];
  pReturn: number[];
  pReturnStd: number[];
  fitCurve: number[] | null;
  fidelity: number | null;
  epg: number | null;
}

export interface ErrorResult {
  type: "error";
  message: string;
}

export interface ReadyResult {
  type: "ready";
}

export type SimResult =
  | StabilityResult
  | RabiResult
  | RamseyResult
  | RBResult
  | ErrorResult
  | ReadyResult;
