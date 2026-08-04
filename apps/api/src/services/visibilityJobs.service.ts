import type { BusinessCandidate, JobStatus, UserRole } from "@aeo-pcs/shared";
import {
  ACTIVE_VISIBILITY_JOB_STATUSES,
  COPY,
  headquartersLocation,
  normalizeGeoLocationList,
} from "@aeo-pcs/shared";
import { BusinessModel } from "../models/Business";
import { VisibilityJobModel } from "../models/VisibilityJob";
import { AppError } from "../utils/AppError";
import { getAeoSettings, getEnabledVisibilityModels } from "./aeoSettings.service";
import { enqueueVisibilityJob, requestCancelVisibilityJob } from "./jobRunner";
import { publishJobUpdate } from "./jobEvents";
import { buildActionPlan, generateItemContent } from "./plan";
import { generatePrompts } from "./prompts";
import { buildReportHtml, wrapReportDocument } from "./report";
import { syncChecklistFromPlan } from "./checklist.service";
import { getBusinessInsights, listVisibilityJobs } from "./insights.service";
import { assertVisibilityRunAllowed, assertAiFeaturesAllowed } from "./subscriptions.service";

export { getBusinessInsights, listVisibilityJobs };

const ACTIVE_STATUSES: JobStatus[] = [...ACTIVE_VISIBILITY_JOB_STATUSES];

export async function findActiveVisibilityJobForBusiness(businessId: string) {
  return VisibilityJobModel.findOne({
    businessId,
    status: { $in: ACTIVE_STATUSES },
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function getActiveVisibilityJob(userId: string) {
  const owned = await BusinessModel.findOne({ ownerUserId: userId }).select("_id").lean();
  if (!owned) {
    throw new AppError("Business not found", 404);
  }

  const job = await findActiveVisibilityJobForBusiness(String(owned._id));
  if (!job) {
    return { job: null };
  }

  const resolved = await failIfStale(job);
  if (!ACTIVE_STATUSES.includes(resolved.status as JobStatus)) {
    return { job: null };
  }

  return { job: serializeJob(resolved as Record<string, unknown>) };
}

export async function cancelVisibilityJob(input: {
  jobId: string;
  userId: string;
  userRole?: UserRole;
}) {
  const job = await VisibilityJobModel.findById(input.jobId);
  if (!job) {
    throw new AppError("Job not found", 404);
  }
  assertJobAccess(job, input.userId, input.userRole);

  if (!ACTIVE_STATUSES.includes(job.status as JobStatus)) {
    throw new AppError("Only in-progress visibility checks can be cancelled", 400);
  }

  requestCancelVisibilityJob(input.jobId);
  job.set("status", "cancelled");
  job.set("error", COPY.visibility.cancelledMessage);
  await job.save();

  publishJobUpdate(input.jobId, {
    status: "cancelled",
    error: COPY.visibility.cancelledMessage,
  });

  return {
    job: serializeJob(job.toObject() as Record<string, unknown>),
  };
}

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
  const p = plan as {
    automatable?: unknown[];
    manual?: unknown[];
    presenceAudit?: unknown;
  };
  const automatable = Array.isArray(p.automatable) ? p.automatable : [];
  const manual = Array.isArray(p.manual) ? p.manual : [];
  if (!automatable.length && !manual.length) return null;
  return {
    automatable,
    manual,
    presenceAudit: p.presenceAudit || undefined,
  };
}

function serializeJob(job: Record<string, unknown>) {
  return {
    id: String(job._id),
    status: job.status,
    progress: job.progress,
    business: job.business,
    category: job.category,
    city: job.city,
    state: job.state,
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

async function loadOwnedBusinessForRun(userId: string) {
  const owned = await assertVisibilityRunAllowed(userId);
  if (!owned.profileCompletedAt) {
    throw new AppError("Complete your business profile before running a visibility check", 403);
  }
  if (!owned.name?.trim() || !owned.city?.trim() || !owned.country?.trim()) {
    throw new AppError("Business profile is incomplete", 400);
  }
  return owned;
}

function buildJobBusinessSnapshot(
  owned: {
    name?: string | null;
    category?: string | null;
    description?: string | null;
    nameAliases?: unknown;
    targetItems?: unknown;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    countryCode?: string | null;
    stateCode?: string | null;
    targetLocations?: unknown;
    websiteUrl?: string | null;
    googleBusinessUrl?: string | null;
  },
  category: string,
) {
  const hq = headquartersLocation({
    city: owned.city || "",
    state: owned.state || undefined,
    country: owned.country || "",
    countryCode: owned.countryCode || undefined,
    stateCode: owned.stateCode || undefined,
  });
  const targetLocations = normalizeGeoLocationList(owned.targetLocations, hq, 15);
  const resolvedTargets = targetLocations.length > 0 ? targetLocations : [hq];

  const nameAliases = Array.isArray(owned.nameAliases)
    ? owned.nameAliases.map(String)
    : [];
  const targetItems = Array.isArray(owned.targetItems)
    ? owned.targetItems.map(String)
    : [];

  const business: BusinessCandidate = {
    name: (owned.name || "").trim(),
    category: category || owned.category || "Other",
    address: [hq.city, hq.state, hq.country].filter(Boolean).join(", "),
    description: owned.description || "",
    nameAliases,
    targetLocations: resolvedTargets,
    targetItems,
  };

  return { hq, resolvedTargets, business };
}

/** Start a visibility check: create job, generate (or reuse) prompts, leave in `ready` for review. */
export async function startVisibilityJob(input: {
  userId: string;
  category: string;
  /** When provided, skip generation and open review with these prompts (e.g. reuse last run). */
  prompts?: string[];
}) {
  const owned = await loadOwnedBusinessForRun(input.userId);

  const active = await findActiveVisibilityJobForBusiness(String(owned._id));
  if (active) {
    throw new AppError(
      COPY.visibility.alreadyInProgress,
      409,
      "VISIBILITY_IN_PROGRESS",
      { jobId: String(active._id) }
    );
  }

  const settings = await getAeoSettings();
  const reusePrompts = (input.prompts || []).map((p) => p.trim()).filter(Boolean);
  if (reusePrompts.length) {
    if (reusePrompts.length > settings.promptsPerRun) {
      throw new AppError(
        `Provide at most ${settings.promptsPerRun} prompts for a visibility run`,
        400
      );
    }
  }

  const category = input.category || owned.category || "Other";
  const { hq, resolvedTargets, business } = buildJobBusinessSnapshot(owned, category);

  if (reusePrompts.length) {
    const job = await VisibilityJobModel.create({
      userId: input.userId,
      businessId: owned._id,
      status: "ready",
      progress: { completed: 0, total: 0 },
      business,
      category,
      city: hq.city,
      state: hq.state,
      country: hq.country,
      websiteUrl: owned.websiteUrl || "",
      googleBusinessUrl: owned.googleBusinessUrl || "",
      targetLocations: resolvedTargets,
      targetItems: business.targetItems,
      nameAliases: business.nameAliases,
      prompts: reusePrompts,
      itemOutputs: {},
    });
    return { job: serializeJob(job.toObject() as Record<string, unknown>) };
  }

  const job = await VisibilityJobModel.create({
    userId: input.userId,
    businessId: owned._id,
    status: "generating",
    progress: { completed: 0, total: 0 },
    business,
    category,
    city: hq.city,
    state: hq.state,
    country: hq.country,
    websiteUrl: owned.websiteUrl || "",
    googleBusinessUrl: owned.googleBusinessUrl || "",
    targetLocations: resolvedTargets,
    targetItems: business.targetItems,
    nameAliases: business.nameAliases,
    prompts: [],
    itemOutputs: {},
  });

  const jobId = String(job._id);

  try {
    const prompts = await generatePrompts({
      business,
      category,
      customCategory: owned.customCategory ? String(owned.customCategory) : undefined,
      city: hq.city,
      state: hq.state || undefined,
      country: hq.country,
      countryCode: owned.countryCode ? String(owned.countryCode) : undefined,
      stateCode: owned.stateCode ? String(owned.stateCode) : undefined,
      targetLocations: resolvedTargets,
      targetItems: business.targetItems,
      websiteUrl: owned.websiteUrl ? String(owned.websiteUrl) : undefined,
      googleBusinessUrl: owned.googleBusinessUrl ? String(owned.googleBusinessUrl) : undefined,
      socialLinks: ((owned as { socialLinks?: { label?: string; url?: string }[] }).socialLinks || []).map(
        (link) => ({
          label: String(link.label || ""),
          url: String(link.url || ""),
        }),
      ),
      usage: { userId: input.userId, businessId: String(owned._id) },
    });

    const current = await VisibilityJobModel.findById(jobId);
    if (!current || current.status === "cancelled") {
      throw new AppError(COPY.visibility.cancelledMessage, 499, "VISIBILITY_CANCELLED");
    }

    current.set("prompts", prompts);
    current.set("status", "ready");
    current.set("error", null);
    await current.save();

    return { job: serializeJob(current.toObject() as Record<string, unknown>) };
  } catch (err) {
    const current = await VisibilityJobModel.findById(jobId);
    if (current && current.status === "generating") {
      const message = err instanceof Error ? err.message : "Prompt generation failed";
      current.set("status", "failed");
      current.set("error", message);
      await current.save();
    }
    throw err;
  }
}

/** Confirm edited prompts and enqueue the model visibility check. */
export async function runVisibilityJob(input: {
  userId: string;
  jobId: string;
  prompts: string[];
  userRole?: UserRole;
}) {
  const settings = await getAeoSettings();
  if (input.prompts.length < 1 || input.prompts.length > settings.promptsPerRun) {
    throw new AppError(
      `Provide between 1 and ${settings.promptsPerRun} prompts for a visibility run`,
      400
    );
  }

  const job = await VisibilityJobModel.findById(input.jobId);
  if (!job) {
    throw new AppError("Job not found", 404);
  }
  assertJobAccess(job, input.userId, input.userRole);

  if (job.status !== "ready") {
    if (job.status === "queued" || job.status === "running") {
      throw new AppError(
        COPY.visibility.alreadyInProgress,
        409,
        "VISIBILITY_IN_PROGRESS",
        { jobId: String(job._id) }
      );
    }
    throw new AppError("This visibility check is not ready to run", 400);
  }

  const models = await getEnabledVisibilityModels();
  if (!models.length) {
    throw new AppError("No visibility models configured", 500);
  }

  job.set("prompts", input.prompts.map((p) => p.trim()).filter(Boolean));
  job.set("status", "queued");
  job.set("progress", {
    completed: 0,
    total: input.prompts.length * models.length,
  });
  job.set("error", null);
  await job.save();

  await enqueueVisibilityJob(String(job._id));

  return {
    jobId: String(job._id),
    job: serializeJob(job.toObject() as Record<string, unknown>),
  };
}

/** @deprecated Prefer startVisibilityJob + runVisibilityJob. Kept for older clients. */
export async function createVisibilityJob(input: {
  userId: string;
  category: string;
  prompts: string[];
}) {
  const owned = await loadOwnedBusinessForRun(input.userId);

  const settings = await getAeoSettings();
  if (input.prompts.length < 1 || input.prompts.length > settings.promptsPerRun) {
    throw new AppError(
      `Provide between 1 and ${settings.promptsPerRun} prompts for a visibility run`,
      400
    );
  }

  const active = await findActiveVisibilityJobForBusiness(String(owned._id));
  if (active) {
    throw new AppError(
      COPY.visibility.alreadyInProgress,
      409,
      "VISIBILITY_IN_PROGRESS",
      { jobId: String(active._id) }
    );
  }

  const models = await getEnabledVisibilityModels();
  const category = input.category || owned.category || "Other";
  const { hq, resolvedTargets, business } = buildJobBusinessSnapshot(owned, category);

  const job = await VisibilityJobModel.create({
    userId: input.userId,
    businessId: owned._id,
    status: "queued",
    progress: {
      completed: 0,
      total: input.prompts.length * models.length,
    },
    business,
    category,
    city: hq.city,
    state: hq.state,
    country: hq.country,
    websiteUrl: owned.websiteUrl || "",
    googleBusinessUrl: owned.googleBusinessUrl || "",
    targetLocations: resolvedTargets,
    targetItems: business.targetItems,
    nameAliases: business.nameAliases,
    prompts: input.prompts,
    itemOutputs: {},
  });

  await enqueueVisibilityJob(String(job._id));
  return { jobId: String(job._id) };
}

const STALE_QUEUED_RUNNING_MS = 25 * 60 * 1000;
const STALE_GENERATING_MS = 10 * 60 * 1000;
const STALE_READY_MS = 7 * 24 * 60 * 60 * 1000;

async function failIfStale(job: {
  _id: unknown;
  status?: string;
  updatedAt?: Date | string;
}) {
  const status = job.status;
  if (!status || !ACTIVE_STATUSES.includes(status as JobStatus)) return job;
  if (!job.updatedAt) return job;

  const age = Date.now() - new Date(job.updatedAt).getTime();
  let limit = STALE_QUEUED_RUNNING_MS;
  if (status === "generating") limit = STALE_GENERATING_MS;
  else if (status === "ready") limit = STALE_READY_MS;

  if (age <= limit) return job;

  const updated = await VisibilityJobModel.findByIdAndUpdate(
    job._id,
    {
      $set: {
        status: "failed",
        error:
          status === "ready"
            ? "This visibility check expired before it was run. Please start a new check."
            : "Visibility check timed out. Please start a new check.",
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
    ? await BusinessModel.findById(job.businessId)
        .select("websiteUrl googleBusinessUrl socialLinks")
        .lean()
    : null;

  const plan = await buildActionPlan({
    business: job.business as never,
    category: job.category || "Other",
    city: job.city || "",
    state: job.state || "",
    country: job.country || "",
    websiteUrl: profile?.websiteUrl || job.websiteUrl || undefined,
    googleBusinessUrl: profile?.googleBusinessUrl || job.googleBusinessUrl || undefined,
    socialLinks: (profile?.socialLinks?.length
      ? profile.socialLinks
      : []) as { label: string; url: string }[],
    results: job.results as never,
    score: job.score as never,
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
    state: job.state || "",
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
  format?: "pdf" | "html";
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
  const reportInput = {
    selected: (job.business as never) || null,
    category: job.category || "",
    city: job.city || "",
    state: job.state || "",
    country: job.country || "",
    results: (job.results as never) || null,
    score: (job.score as never) || null,
    plan: (job.plan as never) || null,
    itemOutputs,
    generatedAt: job.updatedAt ? new Date(job.updatedAt) : new Date(),
    jobError: job.error || null,
  };

  const bodyHtml = buildReportHtml(reportInput);

  const html = wrapReportDocument(bodyHtml);
  const nameSafe = (job.business?.name || "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const format = input.format === "html" ? "html" : "pdf";

  if (format === "html") {
    return {
      html,
      filename: `ai-visibility-report-${nameSafe}.html`,
      contentType: "text/html" as const,
    };
  }

  const { buildReportPdfBuffer } = await import("./pdfReport");
  try {
    const pdf = await buildReportPdfBuffer(reportInput);
    return {
      pdf,
      filename: `ai-visibility-report-${nameSafe}.pdf`,
      contentType: "application/pdf" as const,
    };
  } catch (err) {
    console.error("PDF generation failed, falling back to HTML:", err);
    return {
      html,
      filename: `ai-visibility-report-${nameSafe}.html`,
      contentType: "text/html" as const,
    };
  }
}
