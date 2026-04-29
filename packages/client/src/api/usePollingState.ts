// §14 Version-aware polling hook.
// Sendet ?since=lastVersion; bei notModified kein Re-Render.
// N Fehler in Folge → connectionError gesetzt.

import { useState, useEffect, useRef, useCallback } from "react";
import type { SystemState } from "@lan-os/shared";
import type { StateResponse } from "./client.js";

const MAX_ERRORS = 4;

interface PollingOptions {
  fetchFn: (since?: number) => Promise<StateResponse>;
  intervalMs: number;
  enabled?: boolean;
}

interface PollingResult {
  state: SystemState | null;
  connectionError: string;
  reload: () => void;
}

export function usePollingState({
  fetchFn,
  intervalMs,
  enabled = true,
}: PollingOptions): PollingResult {
  const [state, setState] = useState<SystemState | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const versionRef = useRef<number | undefined>(undefined);
  const errCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doFetch = useCallback(async () => {
    try {
      const resp = await fetchFn(versionRef.current);
      errCountRef.current = 0;
      setConnectionError("");

      if (resp.notModified) return; // Kein Update nötig
      if (resp.state) {
        versionRef.current = resp.state.version;
        setState(resp.state);
      }
    } catch (err) {
      errCountRef.current++;
      if (errCountRef.current >= MAX_ERRORS) {
        setConnectionError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [fetchFn]);

  const reload = useCallback(() => {
    versionRef.current = undefined;
    errCountRef.current = 0;
    setConnectionError("");
    doFetch();
  }, [doFetch]);

  useEffect(() => {
    if (!enabled) return;
    doFetch(); // sofort beim Mount
    timerRef.current = setInterval(doFetch, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [doFetch, intervalMs, enabled]);

  return { state, connectionError, reload };
}
