import type { BusinessInsights, VisibilityJobSummary, VisibilityScore } from "@aeo-pcs/shared";
import { computeVisibilityRunInsights } from "@aeo-pcs/shared";
import { BusinessModel } from "../models/Business";
import { VisibilityJobModel } from "../models/VisibilityJob";
import { AppError } from "../utils/AppError";
import { normalizeVisibilityScore } from "../utils/visibilityAnalysis";
import { checklistProgress } from "./checklist.service";

function monthBounds(d: Date) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { start, end };
}

function latestCompletedScore(jobs: Array<{ score?: unknown }>): VisibilityScore | null {
  for (const job of jobs) {
    const score = normalizeVisibilityScore(job.score as Partial<VisibilityScore>);
    if (score) return score;
  }
  return null;
}

function asScore(score: unknown): VisibilityScore | undefined {
  return normalizeVisibilityScore(score as Partial<VisibilityScore>) ?? undefined;
}

export async function listVisibilityJobs(input: {
  userId: string;
  limit?: number;
}): Promise<VisibilityJobSummary[]> {
  const owned = await BusinessModel.findOne({ ownerUserId: input.userId }).select("_id").lean();
  if (!owned) {
    throw new AppError("Business not found", 404);
  }

  const jobs = await VisibilityJobModel.find({ businessId: owned._id })
    .sort({ createdAt: -1 })
    .limit(input.limit ?? 20)
    .select("status score createdAt plan")
    .lean();

  return jobs.map((job) => ({
    id: String(job._id),
    status: job.status as VisibilityJobSummary["status"],
    score: asScore(job.score),
    createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
    hasPlan: Boolean(job.plan?.automatable?.length || job.plan?.manual?.length),
  }));
}

export async function getBusinessInsights(userId: string): Promise<BusinessInsights> {
  const business = await BusinessModel.findOne({ ownerUserId: userId }).lean();
  if (!business) {
    throw new AppError("Business not found", 404);
  }

  const now = new Date();
  const current = monthBounds(now);
  const prevAnchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
  const previous = monthBounds(prevAnchor);

  const [recentJobs, currentMonthJobs, previousMonthJobs, historyJobs, latestFullJob] =
    await Promise.all([
    VisibilityJobModel.find({ businessId: business._id, status: "completed" })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("status score createdAt plan")
      .lean(),
    VisibilityJobModel.find({
      businessId: business._id,
      status: "completed",
      createdAt: { $gte: current.start, $lt: current.end },
    })
      .sort({ createdAt: -1 })
      .select("score createdAt")
      .lean(),
    VisibilityJobModel.find({
      businessId: business._id,
      status: "completed",
      createdAt: { $gte: previous.start, $lt: previous.end },
    })
      .sort({ createdAt: -1 })
      .select("score createdAt")
      .lean(),
    VisibilityJobModel.find({ businessId: business._id, status: "completed" })
      .sort({ createdAt: 1 })
      .limit(12)
      .select("score createdAt")
      .lean(),
    VisibilityJobModel.findOne({ businessId: business._id, status: "completed" })
      .sort({ createdAt: -1 })
      .select("results score prompts business nameAliases category city targetItems targetLocations")
      .lean(),
  ]);

  const latestScore = latestCompletedScore(recentJobs);
  const currentMonthScore = latestCompletedScore(currentMonthJobs);
  const previousMonthScore = latestCompletedScore(previousMonthJobs);

  let scoreDelta: number | null = null;
  if (
    currentMonthScore &&
    previousMonthScore &&
    typeof currentMonthScore.visibilityPct === "number" &&
    typeof previousMonthScore.visibilityPct === "number"
  ) {
    scoreDelta = currentMonthScore.visibilityPct - previousMonthScore.visibilityPct;
  }

  const checklistItems = business.checklist || [];
  const checklist = checklistProgress(checklistItems);

  const scoreHistory = historyJobs
    .map((job) => {
      const score = asScore(job.score);
      if (!score) return null;
      return {
        date: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
        visibilityPct: score.visibilityPct,
        brandVisibilityPct: score.brandVisibilityPct ?? score.visibilityPct,
        sourceVisibilityPct: score.sourceVisibilityPct ?? 0,
      };
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const lastPrompts = (latestFullJob?.prompts || []).map(String).filter(Boolean);

  let latestRunInsights = null;
  if (latestFullJob?.results?.length && latestFullJob.score) {
    const score = asScore(latestFullJob.score);
    if (score) {
      const bizName = String(latestFullJob.business?.name || business.name || "");
      const aliases = (latestFullJob.nameAliases?.length
        ? latestFullJob.nameAliases
        : latestFullJob.business?.nameAliases || business.nameAliases || []
      ).map(String);
      const ownNames = [bizName, ...aliases].map((n) => String(n ?? "").trim()).filter(Boolean);
      latestRunInsights = computeVisibilityRunInsights(
        latestFullJob.results as Parameters<typeof computeVisibilityRunInsights>[0],
        score,
        ownNames,
        {
          description: String(latestFullJob.business?.description || business.description || ""),
          category: String(latestFullJob.category || business.category || ""),
          targetItems: (latestFullJob.targetItems || business.targetItems || []).map(String),
          targetLocations: (latestFullJob.targetLocations || business.targetLocations || []).map(
            String
          ),
          city: String(business.city || ""),
        }
      );
    }
  }

  return {
    latestScore,
    currentMonthScore,
    previousMonthScore,
    scoreDelta,
    checklist,
    recentJobs: recentJobs.map((job) => ({
      id: String(job._id),
      status: job.status as VisibilityJobSummary["status"],
      score: asScore(job.score),
      createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
      hasPlan: Boolean(job.plan?.automatable?.length || job.plan?.manual?.length),
    })),
    scoreHistory,
    lastPrompts,
    latestRunInsights,
  };
}
