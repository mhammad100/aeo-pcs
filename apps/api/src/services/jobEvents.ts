import type { Response } from "express";
import type { JobStatus, VisibilityJobProgress, VisibilityScore } from "@aeo-pcs/shared";
import type { PromptResult } from "@aeo-pcs/shared";

export type JobStreamPayload = {
  status: JobStatus;
  progress?: VisibilityJobProgress | null;
  results?: PromptResult[] | null;
  score?: VisibilityScore | null;
  error?: string | null;
};

type Listener = (payload: JobStreamPayload) => void;

const listenersByJob = new Map<string, Set<Listener>>();

export function subscribeToJob(jobId: string, listener: Listener): () => void {
  let set = listenersByJob.get(jobId);
  if (!set) {
    set = new Set();
    listenersByJob.set(jobId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) {
      listenersByJob.delete(jobId);
    }
  };
}

export function publishJobUpdate(jobId: string, payload: JobStreamPayload) {
  const set = listenersByJob.get(jobId);
  if (!set?.size) return;
  for (const listener of set) {
    listener(payload);
  }
}

export function writeSse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
