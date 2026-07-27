import { MODELS } from "@aeo-pcs/shared";
import { VisibilityJobModel } from "../models/VisibilityJob";
import { runVisibilityCheck } from "./visibility";

const running = new Set<string>();

export async function enqueueVisibilityJob(jobId: string) {
  if (running.has(jobId)) return;
  running.add(jobId);

  setImmediate(() => {
    void processVisibilityJob(jobId).finally(() => running.delete(jobId));
  });
}

async function processVisibilityJob(jobId: string) {
  const job = await VisibilityJobModel.findById(jobId);
  if (!job) return;

  try {
    job.status = "running";
    job.progress = {
      completed: 0,
      total: (job.prompts?.length || 0) * MODELS.length,
      currentPrompt: "",
      currentModel: "",
    };
    job.error = undefined;
    await job.save();

    const { results, score } = await runVisibilityCheck({
      businessName: job.business?.name || "",
      prompts: job.prompts || [],
      onProgress: async ({ completed, total, currentPrompt, currentModel }) => {
        await VisibilityJobModel.findByIdAndUpdate(jobId, {
          progress: { completed, total, currentPrompt, currentModel },
        });
      },
    });

    await VisibilityJobModel.findByIdAndUpdate(jobId, {
      status: "completed",
      results,
      score,
      progress: {
        completed: score.totalChecks,
        total: score.totalChecks,
        currentPrompt: "",
        currentModel: "",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Visibility check failed";
    await VisibilityJobModel.findByIdAndUpdate(jobId, {
      status: "failed",
      error: message,
    });
  }
}
