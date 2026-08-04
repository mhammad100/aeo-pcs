import type { Request, Response } from "express";
import * as geoService from "../services/geo.service";

export async function listCountries(_req: Request, res: Response) {
  res.json({ countries: geoService.listCountries() });
}

export async function listStates(req: Request, res: Response) {
  const countryCode = String(req.query.countryCode || "");
  res.json({ states: geoService.listStates(countryCode) });
}

export async function listCities(req: Request, res: Response) {
  const countryCode = String(req.query.countryCode || "");
  const stateCode = req.query.stateCode ? String(req.query.stateCode) : undefined;
  res.json({ cities: geoService.listCities(countryCode, stateCode) });
}
