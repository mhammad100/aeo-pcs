import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { generatePrompts } from "../services/prompts";

export async function generate(req: AuthedRequest, res: Response) {
  const prompts = await generatePrompts({
    business: req.body.business,
    category: req.body.category,
    city: req.body.city,
    country: req.body.country,
  });
  res.json({ prompts });
}
