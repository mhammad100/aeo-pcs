import { VisibilityJobModel } from "../models/VisibilityJob";
import { COPY } from "@aeo-pcs/shared";
import { AppError } from "../utils/AppError";
import { getEnabledVisibilityModels } from "./aeoSettings.service";
import { publishJobUpdate } from "./jobEvents";
import { assertAiFeaturesAllowed } from "./subscriptions.service";
import { runVisibilityCheck } from "./visibility";

const running = new Set<string>();
const cancelRequested = new Set<string>();
/** Jobs stuck in running/queued longer than this are marked failed on resume. */
const STALE_MS = 25 * 60 * 1000;

export function requestCancelVisibilityJob(jobId: string) {
  cancelRequested.add(jobId);
}

async function isJobCancelled(jobId: string): Promise<boolean> {
  if (cancelRequested.has(jobId)) return true;
  const job = await VisibilityJobModel.findById(jobId).select("status").lean();
  return job?.status === "cancelled";
}

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

async function markJobCancelled(jobId: string) {
  cancelRequested.delete(jobId);
  await VisibilityJobModel.findByIdAndUpdate(jobId, {
    $set: {
      status: "cancelled",
      error: COPY.visibility.cancelledMessage,
    },
    $unset: { plan: 1 },
  });
  publishJobUpdate(jobId, {
    status: "cancelled",
    error: COPY.visibility.cancelledMessage,
  });
}

async function processVisibilityJob(jobId: string) {
  const job = await VisibilityJobModel.findById(jobId);
  if (!job) return;
  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") return;

  if (await isJobCancelled(jobId)) {
    await markJobCancelled(jobId);
    return;
  }

  try {
    if (job.userId) {
      await assertAiFeaturesAllowed(String(job.userId));
    }

    const models = await getEnabledVisibilityModels();
    const total = (job.prompts?.length || 0) * models.length;

    await VisibilityJobModel.findByIdAndUpdate(jobId, {
      $set: {
        status: "running",
        progress: {
          completed: 0,
          total,
          currentPrompt: "",
          currentModel: "",
        },
        results: [],
        score: null,
        error: null,
      },
      $unset: { plan: 1 },
    });

    publishJobUpdate(jobId, {
      status: "running",
      progress: { completed: 0, total, currentModel: "" },
    });

    const { results, score, partialWarning } = await runVisibilityCheck({
      business: {
        name: job.business?.name || "",
        nameAliases: (job.nameAliases?.length ? job.nameAliases : job.business?.nameAliases) as
          | string[]
          | undefined,
        websiteUrl: job.websiteUrl || undefined,
        googleBusinessUrl: job.googleBusinessUrl || undefined,
      },
      category: job.category || "",
      city: job.city || "",
      country: job.country || "",
      targetLocations: (job.targetLocations?.length
        ? job.targetLocations
        : job.business?.targetLocations) as string[] | undefined,
      targetItems: (job.targetItems?.length ? job.targetItems : job.business?.targetItems) as
        | string[]
        | undefined,
      prompts: job.prompts || [],
      models,
      usage: {
        userId: job.userId ? String(job.userId) : null,
        businessId: job.businessId ? String(job.businessId) : null,
        refs: { jobId },
      },
      shouldAbort: () => isJobCancelled(jobId),
      onProgress: async ({ completed, total: t, currentPrompt, currentModel }) => {
        if (await isJobCancelled(jobId)) {
          throw new AppError("Visibility check cancelled", 499, "VISIBILITY_CANCELLED");
        }
        await VisibilityJobModel.findByIdAndUpdate(jobId, {
          $set: {
            progress: { completed, total: t, currentPrompt, currentModel },
          },
        });
        publishJobUpdate(jobId, {
          status: "running",
          progress: { completed, total: t, currentModel },
        });
      },
    });

    if (await isJobCancelled(jobId)) {
      await markJobCancelled(jobId);
      return;
    }

    const hasAnyAnswer = results.some((r) => r.perModel.some((m) => m.answer?.trim()));
    if (!hasAnyAnswer) {
      throw new Error(
        partialWarning || "All AI model responses failed. Please try again in a few minutes."
      );
    }

    const updated = await VisibilityJobModel.findByIdAndUpdate(
      jobId,
      {
        $set: {
          status: "completed",
          results,
          score,
          progress: {
            completed: total,
            total,
            currentPrompt: "",
            currentModel: "",
          },
          error: partialWarning,
        },
        $unset: { plan: 1 },
      },
      { new: true }
    );

    if (!updated?.results?.length) {
      console.error(`Visibility job ${jobId} completed but results were not persisted`);
    }

    publishJobUpdate(jobId, {
      status: "completed",
      progress: {
        completed: total,
        total,
      },
      results,
      score,
      error: partialWarning,
    });
  } catch (err) {
    if (await isJobCancelled(jobId)) {
      await markJobCancelled(jobId);
      return;
    }

    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Visibility check failed";
    console.error(`Visibility job ${jobId} failed:`, message);
    await VisibilityJobModel.findByIdAndUpdate(jobId, {
      $set: {
        status: "failed",
        error: message,
      },
      $unset: { plan: 1 },
    });

    publishJobUpdate(jobId, {
      status: "failed",
      error: message,
    });
  }
}
