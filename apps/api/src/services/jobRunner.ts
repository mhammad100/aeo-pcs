import { MODELS } from "@aeo-pcs/shared";
import { VisibilityJobModel } from "../models/VisibilityJob";
import { runVisibilityCheck } from "./visibility";

const running = new Set<string>();
/** Jobs stuck in running/queued longer than this are marked failed on resume. */
const STALE_MS = 25 * 60 * 1000;

export async function enqueueVisibilityJob(jobId: string) {
  if (running.has(jobId)) return;
  running.add(jobId);

  setImmediate(() => {
    void processVisibilityJob(jobId).finally(() => running.delete(jobId));
  });
}

/** Re-queue jobs left mid-flight after an API restart; fail ones that are too old. */
export async function resumeInterruptedVisibilityJobs() {
  const stuck = await VisibilityJobModel.find({
    status: { $in: ["queued", "running"] },
  })
    .select("_id status updatedAt")
    .limit(50)
    .lean();

  const now = Date.now();
  for (const job of stuck) {
    const id = String(job._id);
    const age = now - new Date(job.updatedAt as Date).getTime();
    if (age > STALE_MS) {
      console.warn(`Marking stale visibility job ${id} as failed (age ${Math.round(age / 60000)}m)`);
      await VisibilityJobModel.findByIdAndUpdate(id, {
        $set: {
          status: "failed",
          error: "Visibility check timed out. Please start a new check.",
        },
        $unset: { plan: 1 },
      });
      continue;
    }
    console.log(`Resuming visibility job ${id}`);
    await enqueueVisibilityJob(id);
  }
}

async function processVisibilityJob(jobId: string) {
  const job = await VisibilityJobModel.findById(jobId);
  if (!job) return;
  if (job.status === "completed" || job.status === "failed") return;

  try {
    await VisibilityJobModel.findByIdAndUpdate(jobId, {
      $set: {
        status: "running",
        progress: {
          completed: 0,
          total: (job.prompts?.length || 0) * MODELS.length,
          currentPrompt: "",
          currentModel: "",
        },
        results: [],
        score: null,
        error: null,
      },
      $unset: { plan: 1 },
    });

    const { results, score } = await runVisibilityCheck({
      businessName: job.business?.name || "",
      prompts: job.prompts || [],
      usage: {
        userId: job.userId ? String(job.userId) : null,
        businessId: job.businessId ? String(job.businessId) : null,
        refs: { jobId },
      },
      onProgress: async ({ completed, total, currentPrompt, currentModel }) => {
        await VisibilityJobModel.findByIdAndUpdate(jobId, {
          $set: {
            progress: { completed, total, currentPrompt, currentModel },
          },
        });
      },
    });

    const updated = await VisibilityJobModel.findByIdAndUpdate(
      jobId,
      {
        $set: {
          status: "completed",
          results,
          score,
          progress: {
            completed: score.totalChecks,
            total: score.totalChecks,
            currentPrompt: "",
            currentModel: "",
          },
          error: null,
        },
        $unset: { plan: 1 },
      },
      { new: true }
    );

    if (!updated?.results?.length) {
      console.error(`Visibility job ${jobId} completed but results were not persisted`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Visibility check failed";
    console.error(`Visibility job ${jobId} failed:`, message);
    await VisibilityJobModel.findByIdAndUpdate(jobId, {
      $set: {
        status: "failed",
        error: message,
      },
      $unset: { plan: 1 },
    });
  }
}
