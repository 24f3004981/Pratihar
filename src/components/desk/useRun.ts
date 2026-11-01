"use client";
import { useEffect, useState } from "react";
import { api } from "../fetcher";
import type { Run } from "./types";

export type RunView = Run & { gate: { ok: boolean; why: string; rate?: number } };

/** Polls a Trial Day run every two seconds until it finishes. */
export function useRun(runId: string | null | undefined, onDone?: () => void) {
  const [run, setRun] = useState<RunView | null>(null);
  useEffect(() => {
    if (!runId) return setRun(null);
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await api<RunView>(`/api/runs/${runId}`);
        if (stop) return;
        setRun(r);
        if (r.status === "running") timer = setTimeout(tick, 2000);
        else onDone?.();
      } catch {
        if (!stop) timer = setTimeout(tick, 4000);
      }
    };
    void tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);
  return run;
}
