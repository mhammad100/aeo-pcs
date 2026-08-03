import type { Response } from "express";
import { BusinessModel } from "../models/Business";
import type { AuthedRequest } from "../middleware/auth";
import { generatePrompts } from "../services/prompts";
import { assertAiFeaturesAllowed } from "../services/subscriptions.service";
import { AppError } from "../utils/AppError";

export async function generate(req: AuthedRequest, res: Response) {
  await assertAiFeaturesAllowed(req.userId!);
  const owned = await BusinessModel.findOne({ ownerUserId: req.userId }).lean();
  if (!owned) {
    throw new AppError("Business profile not found", 404);
  }

  const prompts = await generatePrompts({
    business: req.body.business,
    category: req.body.category,
    customCategory: owned.customCategory ? String(owned.customCategory) : undefined,
    city: req.body.city,
    country: req.body.country,
    targetLocations: owned.targetLocations?.length
      ? owned.targetLocations.map(String)
      : undefined,
    targetItems: (owned.targetItems || []).map(String),
    websiteUrl: owned.websiteUrl ? String(owned.websiteUrl) : undefined,
    googleBusinessUrl: owned.googleBusinessUrl ? String(owned.googleBusinessUrl) : undefined,
    socialLinks: (owned.socialLinks || []).map((link) => ({
      label: String(link.label),
      url: String(link.url),
    })),
    usage: { userId: req.userId, businessId: String(owned._id) },
  });
  res.json({ prompts });
}
