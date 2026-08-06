import { Router } from "express";
import * as geoController from "../controllers/geo.controller";
import { asyncHandler, validate } from "../middleware/validate";
import { geoCitiesValidators, geoStatesValidators } from "../validators";

export const geoRouter = Router();

geoRouter.get("/countries", asyncHandler(geoController.listCountries));
geoRouter.get(
  "/states",
  validate(geoStatesValidators),
  asyncHandler(geoController.listStates),
);
geoRouter.get(
  "/cities",
  validate(geoCitiesValidators),
  asyncHandler(geoController.listCities),
);
