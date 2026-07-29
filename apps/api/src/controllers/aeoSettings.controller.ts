import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import * as aeoSettingsService from "../services/aeoSettings.service";

export async function getAdminAeoSettings(_req: AuthedRequest, res: Response) {
  const settings = await aeoSettingsService.getAeoSettings();
  res.json({ settings });
}

export async function updateAdminAeoSettings(req: AuthedRequest, res: Response) {
  const settings = await aeoSettingsService.updateAeoSettings(req.body);
  res.json({ settings });
}

export async function getRuntimeAeoSettings(_req: AuthedRequest, res: Response) {
  const settings = await aeoSettingsService.getRuntimeAeoSettings();
  res.json({ settings });
}
