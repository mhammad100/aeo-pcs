import type { BusinessInsights, VisibilityJobSummary, VisibilityScore } from "@aeo-pcs/shared";
import { BusinessModel } from "../models/Business";
import { VisibilityJobModel } from "../models/VisibilityJob";
import { AppError } from "../utils/AppError";
import { checklistProgress } from "./checklist.service";

function monthBounds(d: Date) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { start, end };
}

function latestCompletedScore(jobs: Array<{ score?: unknown }>): VisibilityScore | null {
  for (const job of jobs) {
    const score = job.score as Partial<VisibilityScore> | null | undefined;
    if (score && typeof score.visibilityPct === "number") {
      return {
        visibilityPct: score.visibilityPct,
        totalMentions: score.totalMentions ?? 0,
        totalChecks: score.totalChecks ?? 0,
      };
    }
  }
  return null;
}

function asScore(score: unknown): VisibilityScore | undefined {
  const s = score as Partial<VisibilityScore> | null | undefined;
  if (!s || typeof s.visibilityPct !== "number") return undefined;
  return {
    visibilityPct: s.visibilityPct,
    totalMentions: s.totalMentions ?? 0,
    totalChecks: s.totalChecks ?? 0,
  };
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

  const [recentJobs, currentMonthJobs, previousMonthJobs] = await Promise.all([
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
  };
}
