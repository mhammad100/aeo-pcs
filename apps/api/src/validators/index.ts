import { body, param, query } from "express-validator";
import { CATEGORIES, MAX_PROMPTS_PER_RUN } from "@aeo-pcs/shared";
import { isValidHttpUrl } from "../services/businesses.service";

export const loginValidators = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 }),
  body("revokeOtherSession").optional().isBoolean(),
];

export const signupValidators = loginValidators;

export const changePasswordValidators = [
  body("currentPassword").isString().isLength({ min: 8, max: 128 }),
  body("newPassword").isString().isLength({ min: 8, max: 128 }),
];

export const createAdminUserValidators = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 }),
  body("businessName").optional().isString().trim().isLength({ max: 200 }),
  body("canGenerateActionPlanOnFreeRun").optional().isBoolean(),
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
  body("customCategory")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 120 })
    .custom((value, { req }) => {
      if (req.body.category === "Other" && (!value || String(value).trim().length < 2)) {
        throw new Error("Enter your business type when category is Other");
      }
      return true;
    }),
  body("city").optional({ values: "falsy" }).isString().trim().isLength({ min: 1, max: 100 }),
  body("state").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
  body("country").isString().trim().isLength({ min: 1, max: 100 }),
  body("countryCode").optional({ values: "falsy" }).isString().trim().isLength({ max: 10 }),
  body("stateCode").optional({ values: "falsy" }).isString().trim().isLength({ max: 10 }),
  body("description").isString().trim().isLength({ min: 10, max: 2000 }),
  body("nameAliases").optional().isArray({ max: 10 }),
  body("nameAliases.*").optional().isString().trim().isLength({ min: 1, max: 120 }),
  body("targetLocations").optional().isArray({ max: 15 }),
  body("targetLocations.*.city")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 }),
  body("targetLocations.*.state")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 100 }),
  body("targetLocations.*.country")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 }),
  body("targetLocations.*.countryCode")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 10 }),
  body("targetLocations.*.stateCode")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 10 }),
  body("targetItems").isArray({ min: 1, max: 20 }),
  body("targetItems.*").isString().trim().isLength({ min: 1, max: 120 }),
  body("websiteUrl")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .custom((v) => !v || isValidHttpUrl(v)),
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
  body("city").optional({ values: "falsy" }).isString().trim().isLength({ min: 1, max: 100 }),
  body("state").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
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
  body("city").optional({ values: "falsy" }).isString().trim().isLength({ min: 1, max: 100 }),
  body("state").optional({ values: "falsy" }).isString().trim().isLength({ max: 100 }),
  body("country").isString().trim().isLength({ min: 1, max: 100 }),
];

export const createVisibilityJobValidators = [
  body("category")
    .isString()
    .trim()
    .custom((v) => (CATEGORIES as readonly string[]).includes(v)),
  body("prompts").isArray({ min: 1, max: MAX_PROMPTS_PER_RUN }),
  body("prompts.*").isString().trim().isLength({ min: 3, max: 300 }),
];

export const startVisibilityJobValidators = [
  body("category")
    .isString()
    .trim()
    .custom((v) => (CATEGORIES as readonly string[]).includes(v)),
  body("prompts").optional().isArray({ min: 1, max: MAX_PROMPTS_PER_RUN }),
  body("prompts.*").optional().isString().trim().isLength({ min: 3, max: 300 }),
];

export const jobIdParamValidators = [param("jobId").isMongoId()];

export const runVisibilityJobValidators = [
  param("jobId").isMongoId(),
  body("prompts").isArray({ min: 1, max: MAX_PROMPTS_PER_RUN }),
  body("prompts.*").isString().trim().isLength({ min: 3, max: 300 }),
];

export const buildPlanValidators = [body("jobId").isMongoId()];

export const generatePlanItemValidators = [
  body("jobId").isMongoId(),
  body("itemId").isString().trim().isLength({ min: 1, max: 80 }),
  body("title").isString().trim().isLength({ min: 1, max: 120 }),
  body("description").isString().trim().isLength({ min: 1, max: 500 }),
];

export const checklistKeyParamValidators = [
  param("key").isString().trim().isLength({ min: 1, max: 200 }),
];

export const patchChecklistValidators = [
  body("done").optional().isBoolean(),
  body("note").optional().isString().trim().isLength({ max: 500 }),
];

export const planIdParamValidators = [param("planId").isMongoId()];

export const createProductPlanValidators = [
  body("name").isString().trim().isLength({ min: 1, max: 120 }),
  body("slug").optional().isString().trim().isLength({ min: 1, max: 80 }),
  body("price").isFloat({ min: 0.01 }),
  body("currency").optional().isString().trim().isLength({ min: 3, max: 3 }),
  body("priceLabel").optional().isString().trim().isLength({ max: 40 }),
  body("billingPeriod").optional().isIn(["monthly", "yearly"]),
  body("blurb").optional().isString().trim().isLength({ max: 500 }),
  body("features").optional().isArray({ max: 20 }),
  body("features.*").optional().isString().trim().isLength({ max: 120 }),
  body("visibilityRunsPerMonth").optional().isInt({ min: 0, max: 10000 }),
  body("active").optional().isBoolean(),
  body("sortOrder").optional().isInt({ min: 0, max: 1000 }),
  body("razorpayPlanId").optional().isString().trim().isLength({ max: 64 }),
];

export const updateProductPlanValidators = [
  body("name").optional().isString().trim().isLength({ min: 1, max: 120 }),
  body("slug").optional().isString().trim().isLength({ min: 1, max: 80 }),
  body("price").optional().isFloat({ min: 0.01 }),
  body("currency").optional().isString().trim().isLength({ min: 3, max: 3 }),
  body("priceLabel").optional().isString().trim().isLength({ max: 40 }),
  body("billingPeriod").optional().isIn(["monthly", "yearly"]),
  body("blurb").optional().isString().trim().isLength({ max: 500 }),
  body("features").optional().isArray({ max: 20 }),
  body("features.*").optional().isString().trim().isLength({ max: 120 }),
  body("visibilityRunsPerMonth").optional().isInt({ min: 0, max: 10000 }),
  body("active").optional().isBoolean(),
  body("sortOrder").optional().isInt({ min: 0, max: 1000 }),
  body("razorpayPlanId").optional().isString().trim().isLength({ max: 64 }),
];

export const createInvoiceValidators = [
  body("businessId").isMongoId(),
  body("amount").isFloat({ min: 0 }),
  body("currency").optional().isString().trim().isLength({ min: 3, max: 3 }),
  body("status").optional().isIn(["paid", "open", "void"]),
  body("periodLabel").optional().isString().trim().isLength({ max: 40 }),
  body("note").optional().isString().trim().isLength({ max: 500 }),
  body("subscriptionId").optional().isMongoId(),
];

export const upsertCostRateValidators = [
  body("model").isString().trim().isLength({ min: 1, max: 120 }),
  body("inputPer1MTokens").isFloat({ min: 0 }),
  body("outputPer1MTokens").isFloat({ min: 0 }),
  body("currency").optional().isString().trim().isLength({ min: 3, max: 3 }),
];

export const updateAeoSettingsValidators = [
  body("visibilityModels").optional().isArray({ min: 1, max: 10 }),
  body("visibilityModels.*.id").optional().isString().trim().isLength({ min: 1, max: 80 }),
  body("visibilityModels.*.label").optional().isString().trim().isLength({ min: 1, max: 80 }),
  body("visibilityModels.*.provider")
    .optional()
    .isIn(["google", "openai", "perplexity", "anthropic"]),
  body("visibilityModels.*.modelId").optional().isString().trim().isLength({ min: 1, max: 120 }),
  body("visibilityModels.*.enabled").optional().isBoolean(),
  body("visibilityModels.*.inputPer1MTokens").optional().isFloat({ min: 0 }),
  body("visibilityModels.*.outputPer1MTokens").optional().isFloat({ min: 0 }),
  body("visibilityModels.*.currency").optional().isString().trim().isLength({ min: 3, max: 3 }),
  body("promptGenerationModel").optional().isObject(),
  body("promptGenerationModel.provider")
    .optional()
    .isIn(["google", "openai", "perplexity", "anthropic"]),
  body("promptGenerationModel.modelId").optional().isString().trim().isLength({ min: 1, max: 120 }),
  body("promptGenerationModel.inputPer1MTokens").optional().isFloat({ min: 0 }),
  body("promptGenerationModel.outputPer1MTokens").optional().isFloat({ min: 0 }),
  body("promptGenerationModel.currency")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 3 }),
  body("actionPlanModel").optional().isObject(),
  body("actionPlanModel.provider")
    .optional()
    .isIn(["google", "openai", "perplexity", "anthropic"]),
  body("actionPlanModel.modelId").optional().isString().trim().isLength({ min: 1, max: 120 }),
  body("actionPlanModel.inputPer1MTokens").optional().isFloat({ min: 0 }),
  body("actionPlanModel.outputPer1MTokens").optional().isFloat({ min: 0 }),
  body("actionPlanModel.currency").optional().isString().trim().isLength({ min: 3, max: 3 }),
  body("promptsPerRun").optional().isInt({ min: 1, max: MAX_PROMPTS_PER_RUN }),
  body("usdToInrRate").optional().isFloat({ min: 0.01, max: 1000 }),
];

export const subscribeValidators = [body("planId").isMongoId()];

export const verifyCheckoutValidators = [
  body("razorpayPaymentId").isString().trim().isLength({ min: 1, max: 64 }),
  body("razorpaySubscriptionId").isString().trim().isLength({ min: 1, max: 64 }),
  body("razorpaySignature").isString().trim().isLength({ min: 1, max: 128 }),
];

export const geoStatesValidators = [
  query("countryCode").isString().trim().isLength({ min: 2, max: 3 }),
];

export const geoCitiesValidators = [
  query("countryCode").isString().trim().isLength({ min: 2, max: 3 }),
  query("stateCode").optional().isString().trim().isLength({ min: 1, max: 10 }),
];
