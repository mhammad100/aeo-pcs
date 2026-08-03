import mongoose, { Schema, type InferSchemaType } from "mongoose";

const SourceSchema = new Schema(
  {
    domain: String,
    url: String,
    title: String,
  },
  { _id: false }
);

const ModelResultSchema = new Schema(
  {
    model: String,
    answer: String,
    mentioned: Boolean,
    sourceMentioned: Boolean,
    position: Number,
    sentiment: { type: String, enum: ["positive", "neutral", "negative", null], default: null },
    brandsMentioned: [String],
    sources: [SourceSchema],
  },
  { _id: false }
);

const PromptResultSchema = new Schema(
  {
    prompt: String,
    perModel: [ModelResultSchema],
  },
  { _id: false }
);

const BusinessSchema = new Schema(
  {
    name: String,
    category: String,
    address: String,
    description: String,
    nameAliases: [String],
    targetLocations: [String],
    targetItems: [String],
  },
  { _id: false }
);

const AutomatableSchema = new Schema(
  {
    id: String,
    title: String,
    description: String,
  },
  { _id: false }
);

const ManualSchema = new Schema(
  {
    title: String,
    guidance: String,
  },
  { _id: false }
);

const VisibilityJobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", index: true },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed", "cancelled"],
      default: "queued",
    },
    progress: {
      completed: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      currentPrompt: String,
      currentModel: String,
    },
    business: BusinessSchema,
    category: String,
    city: String,
    country: String,
    prompts: [String],
    results: [PromptResultSchema],
    score: {
      visibilityPct: Number,
      brandVisibilityPct: Number,
      sourceVisibilityPct: Number,
      totalMentions: Number,
      totalSourceMentions: Number,
      totalChecks: Number,
      avgPosition: Number,
      sentimentScore: Number,
    },
    websiteUrl: String,
    googleBusinessUrl: String,
    targetLocations: [String],
    targetItems: [String],
    nameAliases: [String],
    plan: {
      type: new Schema(
        {
          automatable: { type: [AutomatableSchema], default: undefined },
          manual: { type: [ManualSchema], default: undefined },
          presenceAudit: { type: Schema.Types.Mixed, default: undefined },
        },
        { _id: false }
      ),
      default: undefined,
      required: false,
    },
    itemOutputs: {
      type: Map,
      of: String,
      default: {},
    },
    error: String,
  },
  { timestamps: true }
);

export type VisibilityJobDoc = InferSchemaType<typeof VisibilityJobSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const VisibilityJobModel = mongoose.model("VisibilityJob", VisibilityJobSchema);
