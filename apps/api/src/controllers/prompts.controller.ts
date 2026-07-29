import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { generatePrompts } from "../services/prompts";
import { assertAiFeaturesAllowed } from "../services/subscriptions.service";

export async function generate(req: AuthedRequest, res: Response) {
  await assertAiFeaturesAllowed(req.userId!);
  const prompts = await generatePrompts({
    business: req.body.business,
    category: req.body.category,
    city: req.body.city,
    country: req.body.country,
    usage: { userId: req.userId },
  });
  res.json({ prompts });
}
