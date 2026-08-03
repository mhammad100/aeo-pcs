import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import * as businessesService from "../services/businesses.service";

export async function getMe(req: AuthedRequest, res: Response) {
  const business = await businessesService.getMyBusiness(req.userId!);
  res.json({ business });
}

export async function updateMe(req: AuthedRequest, res: Response) {
  const business = await businessesService.updateMyBusiness(req.userId!, {
    name: req.body.name,
    category: req.body.category,
    customCategory: req.body.customCategory,
    city: req.body.city,
    country: req.body.country,
    description: req.body.description,
    nameAliases: req.body.nameAliases,
    targetLocations: req.body.targetLocations,
    targetItems: req.body.targetItems,
    websiteUrl: req.body.websiteUrl,
    googleBusinessUrl: req.body.googleBusinessUrl,
    socialLinks: req.body.socialLinks,
  });
  res.json({ business });
}
