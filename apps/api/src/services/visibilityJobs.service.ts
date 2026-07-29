import type { BusinessCandidate, UserRole } from "@aeo-pcs/shared";
import { BusinessModel } from "../models/Business";
import { VisibilityJobModel } from "../models/VisibilityJob";
import { AppError } from "../utils/AppError";
import { getAeoSettings, getEnabledVisibilityModels } from "./aeoSettings.service";
import { enqueueVisibilityJob } from "./jobRunner";
import { buildActionPlan, generateItemContent } from "./plan";
import { buildReportHtml, wrapReportDocument } from "./report";
import { syncChecklistFromPlan } from "./checklist.service";
import { getBusinessInsights, listVisibilityJobs } from "./insights.service";
import { assertVisibilityRunAllowed, assertAiFeaturesAllowed } from "./subscriptions.service";

export { getBusinessInsights, listVisibilityJobs };

function mapItemOutputs(itemOutputs: unknown): Record<string, string> {
  if (itemOutputs instanceof Map) {
    return Object.fromEntries(itemOutputs);
  }
  return (itemOutputs as Record<string, string>) || {};
}

function assertJobAccess(
  job: { userId?: unknown },
  userId: string,
  userRole?: UserRole
) {
  if (job.userId && String(job.userId) !== userId && userRole !== "admin") {
    throw new AppError("Forbidden", 403);
  }
}

function normalizePlan(plan: unknown) {
  if (!plan || typeof plan !== "object") return null;
  const p = plan as { automatable?: unknown[]; manual?: unknown[] };
  const automatable = Array.isArray(p.automatable) ? p.automatable : [];
  const manual = Array.isArray(p.manual) ? p.manual : [];
  if (!automatable.length && !manual.length) return null;
  return { automatable, manual };
}

function serializeJob(job: Record<string, unknown>) {
  return {
    id: String(job._id),
    status: job.status,
    progress: job.progress,
    business: job.business,
    category: job.category,
    city: job.city,
    country: job.country,
    prompts: job.prompts,
    results: Array.isArray(job.results) && job.results.length ? job.results : null,
    score: job.score || null,
    plan: normalizePlan(job.plan),
    itemOutputs: mapItemOutputs(job.itemOutputs),
    error: job.error || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export async function createVisibilityJob(input: {
  userId: string;
  category: string;
  prompts: string[];
}) {
  const owned = await assertVisibilityRunAllowed(input.userId);
  if (!owned.profileCompletedAt) {
    throw new AppError("Complete your business profile before running a visibility check", 403);
  }
  if (!owned.name?.trim() || !owned.city?.trim() || !owned.country?.trim()) {
    throw new AppError("Business profile is incomplete", 400);
  }

  const settings = await getAeoSettings();
  if (input.prompts.length < 1 || input.prompts.length > settings.promptsPerRun) {
    throw new AppError(
      `Provide between 1 and ${settings.promptsPerRun} prompts for a visibility run`,
      400
    );
  }

  const models = await getEnabledVisibilityModels();

  const business: BusinessCandidate = {
    name: owned.name.trim(),
    category: input.category || owned.category || "Other",
    address: [owned.city, owned.country].filter(Boolean).join(", "),
    description: owned.description || "",
    nameAliases: (owned.nameAliases || []).map(String),
    targetLocations: (owned.targetLocations?.length ? owned.targetLocations : [owned.city]).map(String),
    targetItems: (owned.targetItems || []).map(String),
  };

  const job = await VisibilityJobModel.create({
    userId: input.userId,
    businessId: owned._id,
    status: "queued",
    progress: {
      completed: 0,
      total: input.prompts.length * models.length,
    },
    business,
    category: input.category || owned.category || "Other",
    city: owned.city,
    country: owned.country,
    websiteUrl: owned.websiteUrl || "",
    googleBusinessUrl: owned.googleBusinessUrl || "",
    targetLocations: business.targetLocations,
    targetItems: business.targetItems,
    nameAliases: business.nameAliases,
    prompts: input.prompts,
    itemOutputs: {},
  });

  await enqueueVisibilityJob(String(job._id));
  return { jobId: String(job._id) };
}

const STALE_JOB_MS = 25 * 60 * 1000;

async function failIfStale(job: {
  _id: unknown;
  status?: string;
  updatedAt?: Date | string;
}) {
  if (job.status !== "queued" && job.status !== "running") return job;
  if (!job.updatedAt) return job;
  const age = Date.now() - new Date(job.updatedAt).getTime();
  if (age <= STALE_JOB_MS) return job;

  const updated = await VisibilityJobModel.findByIdAndUpdate(
    job._id,
    {
      $set: {
        status: "failed",
        error: "Visibility check timed out. Please start a new check.",
      },
      $unset: { plan: 1 },
    },
    { new: true }
  ).lean();

  return (updated || job) as typeof job;
}

export async function getVisibilityJob(input: {
  jobId: string;
  userId: string;
  userRole?: UserRole;
}) {
  const job = await VisibilityJobModel.findById(input.jobId).lean();
  if (!job) {
    throw new AppError("Job not found", 404);
  }
  assertJobAccess(job, input.userId, input.userRole);
  const resolved = await failIfStale(job);
  return serializeJob(resolved as Record<string, unknown>);
}

export async function buildPlanForJob(input: {
  jobId: string;
  userId: string;
  userRole?: UserRole;
}) {
  if (input.userRole !== "admin") {
    await assertAiFeaturesAllowed(input.userId);
  }

  const job = await VisibilityJobModel.findById(input.jobId);
  if (!job) {
    throw new AppError("Job not found", 404);
  }
  assertJobAccess(job, input.userId, input.userRole);
  if (job.status !== "completed" || !job.results?.length) {
    throw new AppError("Visibility job is not completed yet", 400);
  }

  const profile = job.businessId
    ? await BusinessModel.findById(job.businessId).select("websiteUrl").lean()
    : null;

  const plan = await buildActionPlan({
    business: job.business as never,
    category: job.category || "Other",
    city: job.city || "",
    country: job.country || "",
    websiteUrl: profile?.websiteUrl || undefined,
    results: job.results as never,
    usage: {
      userId: input.userId,
      businessId: job.businessId ? String(job.businessId) : null,
      refs: { jobId: input.jobId },
    },
  });

  job.set("plan", plan);
  job.set("itemOutputs", {});
  await job.save();

  if (job.businessId) {
    await syncChecklistFromPlan({
      businessId: String(job.businessId),
      jobId: String(job._id),
      plan,
    });
  }

  return { plan };
}

export async function generatePlanItem(input: {
  jobId: string;
  userId: string;
  userRole?: UserRole;
  itemId: string;
  title: string;
  description: string;
}) {
  if (input.userRole !== "admin") {
    await assertAiFeaturesAllowed(input.userId);
  }

  const job = await VisibilityJobModel.findById(input.jobId);
  if (!job) {
    throw new AppError("Job not found", 404);
  }
  assertJobAccess(job, input.userId, input.userRole);
  if (!job.plan) {
    throw new AppError("Action plan not built yet", 400);
  }

  const content = await generateItemContent({
    business: job.business as never,
    category: job.category || "Other",
    city: job.city || "",
    country: job.country || "",
    item: { title: input.title, description: input.description },
    usage: {
      userId: input.userId,
      businessId: job.businessId ? String(job.businessId) : null,
      refs: { jobId: input.jobId, itemId: input.itemId },
    },
  });

  job.set(`itemOutputs.${input.itemId}`, content);
  await job.save();
  return { content };
}

export async function getReportForJob(input: {
  jobId: string;
  userId: string;
  userRole?: UserRole;
}) {
  const job = await VisibilityJobModel.findById(input.jobId).lean();
  if (!job) {
    throw new AppError("Job not found", 404);
  }
  assertJobAccess(job, input.userId, input.userRole);

  if (job.status !== "completed" || !job.results?.length || !job.score) {
    throw new AppError("Visibility results are not ready yet", 400);
  }

  const itemOutputs = mapItemOutputs(job.itemOutputs);
  const bodyHtml = buildReportHtml({
    selected: (job.business as never) || null,
    category: job.category || "",
    city: job.city || "",
    country: job.country || "",
    results: (job.results as never) || null,
    score: (job.score as never) || null,
    plan: (job.plan as never) || null,
    itemOutputs,
  });

  const html = wrapReportDocument(bodyHtml);
  const nameSafe = (job.business?.name || "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return {
    html,
    filename: `ai-visibility-report-${nameSafe}.html`,
  };
}
