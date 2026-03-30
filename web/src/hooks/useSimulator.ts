import { useCallback, useEffect, useRef, useState } from "react";
import type { SimRequest, SimResult } from "../worker/types";

export function useSimulator() {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const resolveRef = useRef<((result: SimResult) => void) | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../worker/pyodide-worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event: MessageEvent<SimResult>) => {
      const data = event.data;
      if (data.type === "ready") {
        setReady(true);
        return;
      }
      setLoading(false);
      if (resolveRef.current) {
        resolveRef.current(data);
        resolveRef.current = null;
      }
    };
    worker.onerror = (e) => {
      console.error("Worker error:", e);
      setLoading(false);
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const run = useCallback(
    (req: SimRequest): Promise<SimResult> => {
      return new Promise((resolve) => {
        setLoading(true);
        resolveRef.current = resolve;
        workerRef.current?.postMessage(req);
      });
    },
    [],
  );

  return { ready, loading, run };
}
