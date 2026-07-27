import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import { searchBusiness } from "../services/businessSearch";

export async function search(req: AuthedRequest, res: Response) {
  const candidates = await searchBusiness(req.body.name, req.body.city, req.body.country);
  res.json({ candidates });
}
