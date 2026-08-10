import mongoose, { Schema, type InferSchemaType } from "mongoose";

const VisibilityModelSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    provider: {
      type: String,
      required: true,
      enum: ["google", "openai", "perplexity", "anthropic"],
    },
    modelId: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    inputPer1MTokens: { type: Number, required: true, min: 0 },
    outputPer1MTokens: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", uppercase: true },
  },
  { _id: false }
);

const TaskModelSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ["google", "openai", "perplexity", "anthropic"],
    },
    modelId: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    inputPer1MTokens: { type: Number, required: true, min: 0 },
    outputPer1MTokens: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", uppercase: true },
  },
  { _id: false }
);

const AeoSettingsSchema = new Schema(
  {
    /** Singleton key — only one settings document. */
    key: { type: String, required: true, unique: true, default: "default" },
    visibilityModels: { type: [VisibilityModelSchema], default: [] },
    promptGenerationModel: { type: TaskModelSchema, required: true },
    actionPlanModel: { type: TaskModelSchema, required: true },
    promptsPerRun: { type: Number, required: true, min: 1, max: 20, default: 5 },
    /** INR per 1 USD — used to convert LLM costs for profit reporting. */
    usdToInrRate: { type: Number, required: true, min: 0.01, default: 83 },
  },
  { timestamps: true }
);

export type AeoSettingsDoc = InferSchemaType<typeof AeoSettingsSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AeoSettingsModel = mongoose.model("AeoSettings", AeoSettingsSchema);
