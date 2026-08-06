"use client";

import { useEffect } from "react";
import type { JobStatus, VisibilityJobProgress, VisibilityScore } from "@aeo-pcs/shared";
import type { PromptResult } from "@aeo-pcs/shared";
import { api } from "@/lib/api";
import { useAppDispatch } from "@/store/hooks";
import { setError, setJobSnapshot } from "@/store/visibilitySlice";

type StreamPayload = {
  status: JobStatus;
  progress?: VisibilityJobProgress | null;
  results?: PromptResult[] | null;
  score?: VisibilityScore | null;
  error?: string | null;
};

function applyPayload(dispatch: ReturnType<typeof useAppDispatch>, payload: StreamPayload) {
  dispatch(
    setJobSnapshot({
      status: payload.status,
      progress: payload.progress ?? null,
      results: payload.results?.length ? payload.results : null,
      score: payload.score ?? null,
      error: payload.error ?? null,
    })
  );
}

export function useVisibilityJobStream(jobId: string | null) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!jobId) return;

    let closed = false;
    let source: EventSource | null = null;

    const connect = () => {
      if (closed) return;
      source?.close();
      source = new EventSource(api.visibilityJobStreamUrl(jobId));

      source.addEventListener("snapshot", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as StreamPayload;
          applyPayload(dispatch, payload);
          if (payload.status === "completed" || payload.status === "failed" || payload.status === "cancelled") {
            closed = true;
            source?.close();
          }
        } catch {
          dispatch(setError("Failed to read visibility update"));
        }
      });

      source.addEventListener("update", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as StreamPayload;
          applyPayload(dispatch, payload);
          if (payload.status === "completed" || payload.status === "failed" || payload.status === "cancelled") {
            closed = true;
            source?.close();
          }
        } catch {
          dispatch(setError("Failed to read visibility update"));
        }
      });

      source.onerror = () => {
        source?.close();
        if (!closed) {
          window.setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      source?.close();
    };
  }, [dispatch, jobId]);
}
