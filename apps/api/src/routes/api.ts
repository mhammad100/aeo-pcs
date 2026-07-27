import { Router } from "express";
import { body, param } from "express-validator";
import { CATEGORIES } from "@aeo-pcs/shared";
import { asyncHandler, validate } from "../middleware/validate";
import { searchBusiness } from "../services/businessSearch";
import { generatePrompts } from "../services/prompts";
import { buildActionPlan, generateItemContent } from "../services/plan";
import { buildReportHtml, wrapReportDocument } from "../services/report";
import { enqueueVisibilityJob } from "../services/jobRunner";
import { VisibilityJobModel } from "../models/VisibilityJob";

const businessBody = [
  body("business.name").isString().trim().isLength({ min: 1, max: 200 }),
  body("business.category").optional().isString().trim().isLength({ max: 200 }),
  body("business.address").optional().isString().trim().isLength({ max: 300 }),
  body("business.description").optional().isString().trim().isLength({ max: 2000 }),
];

export const apiRouter = Router();

apiRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    res.json({ ok: true });
  })
);

apiRouter.post(
  "/business/search",
  validate([
    body("name").isString().trim().isLength({ min: 1, max: 200 }),
    body("city").isString().trim().isLength({ min: 1, max: 100 }),
  ]),
  asyncHandler(async (req, res) => {
    const candidates = await searchBusiness(req.body.name, req.body.city);
    res.json({ candidates });
  })
);

apiRouter.post(
  "/prompts/generate",
  validate([
    ...businessBody,
    body("category")
      .isString()
      .trim()
      .custom((v) => (CATEGORIES as readonly string[]).includes(v)),
    body("city").isString().trim().isLength({ min: 1, max: 100 }),
  ]),
  asyncHandler(async (req, res) => {
    const prompts = await generatePrompts({
      business: req.body.business,
      category: req.body.category,
      city: req.body.city,
    });
    res.json({ prompts });
  })
);

apiRouter.post(
  "/visibility/jobs",
  validate([
    ...businessBody,
    body("category")
      .isString()
      .trim()
      .custom((v) => (CATEGORIES as readonly string[]).includes(v)),
    body("city").isString().trim().isLength({ min: 1, max: 100 }),
    body("prompts").isArray({ min: 1, max: 5 }),
    body("prompts.*").isString().trim().isLength({ min: 3, max: 300 }),
  ]),
  asyncHandler(async (req, res) => {
    const job = await VisibilityJobModel.create({
      status: "queued",
      progress: {
        completed: 0,
        total: req.body.prompts.length * 3,
      },
      business: req.body.business,
      category: req.body.category,
      city: req.body.city,
      prompts: req.body.prompts,
      itemOutputs: {},
    });

    await enqueueVisibilityJob(String(job._id));
    res.status(202).json({ jobId: String(job._id) });
  })
);

apiRouter.get(
  "/visibility/jobs/:jobId",
  validate([param("jobId").isMongoId()]),
  asyncHandler(async (req, res) => {
    const job = await VisibilityJobModel.findById(req.params.jobId).lean();
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const itemOutputs =
      job.itemOutputs instanceof Map
        ? Object.fromEntries(job.itemOutputs)
        : (job.itemOutputs as Record<string, string>) || {};

    res.json({
      id: String(job._id),
      status: job.status,
      progress: job.progress,
      business: job.business,
      category: job.category,
      city: job.city,
      prompts: job.prompts,
      results: job.results,
      score: job.score,
      plan: job.plan,
      itemOutputs,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  })
);

apiRouter.post(
  "/plans",
  validate([body("jobId").isMongoId()]),
  asyncHandler(async (req, res) => {
    const job = await VisibilityJobModel.findById(req.body.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status !== "completed" || !job.results?.length) {
      return res.status(400).json({ error: "Visibility job is not completed yet" });
    }

    const plan = await buildActionPlan({
      business: job.business as never,
      category: job.category || "Other",
      city: job.city || "",
      results: job.results as never,
    });

    job.set("plan", plan);
    job.set("itemOutputs", {});
    await job.save();

    res.json({ plan });
  })
);

apiRouter.post(
  "/plans/items/generate",
  validate([
    body("jobId").isMongoId(),
    body("itemId").isString().trim().isLength({ min: 1, max: 80 }),
    body("title").isString().trim().isLength({ min: 1, max: 120 }),
    body("description").isString().trim().isLength({ min: 1, max: 500 }),
  ]),
  asyncHandler(async (req, res) => {
    const job = await VisibilityJobModel.findById(req.body.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (!job.plan) return res.status(400).json({ error: "Action plan not built yet" });

    const content = await generateItemContent({
      business: job.business as never,
      category: job.category || "Other",
      city: job.city || "",
      item: { title: req.body.title, description: req.body.description },
    });

    job.set(`itemOutputs.${req.body.itemId}`, content);
    await job.save();

    res.json({ content });
  })
);

apiRouter.get(
  "/reports/:jobId",
  validate([param("jobId").isMongoId()]),
  asyncHandler(async (req, res) => {
    const job = await VisibilityJobModel.findById(req.params.jobId).lean();
    if (!job) return res.status(404).json({ error: "Job not found" });

    const itemOutputs =
      job.itemOutputs instanceof Map
        ? Object.fromEntries(job.itemOutputs)
        : (job.itemOutputs as Record<string, string>) || {};

    const bodyHtml = buildReportHtml({
      selected: (job.business as never) || null,
      category: job.category || "",
      city: job.city || "",
      results: (job.results as never) || null,
      score: (job.score as never) || null,
      plan: (job.plan as never) || null,
      itemOutputs,
    });

    const html = wrapReportDocument(bodyHtml);
    const nameSafe = (job.business?.name || "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    res.json({
      html,
      filename: `ai-visibility-report-${nameSafe}.html`,
    });
  })
);
