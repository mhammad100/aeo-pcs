import { body, param } from "express-validator";
import { CATEGORIES } from "@aeo-pcs/shared";
import { isValidHttpUrl } from "../services/businesses.service";

export const loginValidators = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 }),
];

export const signupValidators = loginValidators;

export const createAdminUserValidators = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 }),
  body("businessName").optional().isString().trim().isLength({ max: 200 }),
];

export const setUserStatusValidators = [
  param("userId").isMongoId(),
  body("status").isIn(["active", "disabled"]),
];

export const businessProfileValidators = [
  body("name").isString().trim().isLength({ min: 1, max: 200 }),
  body("category")
    .isString()
    .trim()
    .custom((v) => (CATEGORIES as readonly string[]).includes(v)),
  body("city").isString().trim().isLength({ min: 1, max: 100 }),
  body("country").isString().trim().isLength({ min: 1, max: 100 }),
  body("description").optional().isString().trim().isLength({ max: 2000 }),
  body("websiteUrl")
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .custom((v) => isValidHttpUrl(v)),
  body("googleBusinessUrl")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .custom((v) => !v || isValidHttpUrl(v)),
  body("socialLinks").optional().isArray({ max: 20 }),
  body("socialLinks.*.label").optional().isString().trim().isLength({ min: 1, max: 80 }),
  body("socialLinks.*.url")
    .optional()
    .isString()
    .trim()
    .custom((v) => isValidHttpUrl(v)),
];

export const businessSearchValidators = [
  body("name").isString().trim().isLength({ min: 1, max: 200 }),
  body("city").isString().trim().isLength({ min: 1, max: 100 }),
  body("country").isString().trim().isLength({ min: 1, max: 100 }),
];

const candidateBusinessBody = [
  body("business.name").isString().trim().isLength({ min: 1, max: 200 }),
  body("business.category").optional().isString().trim().isLength({ max: 200 }),
  body("business.address").optional().isString().trim().isLength({ max: 300 }),
  body("business.description").optional().isString().trim().isLength({ max: 2000 }),
];

export const generatePromptsValidators = [
  ...candidateBusinessBody,
  body("category")
    .isString()
    .trim()
    .custom((v) => (CATEGORIES as readonly string[]).includes(v)),
  body("city").isString().trim().isLength({ min: 1, max: 100 }),
  body("country").isString().trim().isLength({ min: 1, max: 100 }),
];

export const createVisibilityJobValidators = [
  body("category")
    .isString()
    .trim()
    .custom((v) => (CATEGORIES as readonly string[]).includes(v)),
  body("prompts").isArray({ min: 1, max: 5 }),
  body("prompts.*").isString().trim().isLength({ min: 3, max: 300 }),
];

export const jobIdParamValidators = [param("jobId").isMongoId()];

export const buildPlanValidators = [body("jobId").isMongoId()];

export const generatePlanItemValidators = [
  body("jobId").isMongoId(),
  body("itemId").isString().trim().isLength({ min: 1, max: 80 }),
  body("title").isString().trim().isLength({ min: 1, max: 120 }),
  body("description").isString().trim().isLength({ min: 1, max: 500 }),
];
