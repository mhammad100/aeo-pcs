import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UsageEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", default: null, index: true },
    feature: { type: String, required: true, trim: true, index: true },
    model: { type: String, required: true, trim: true, index: true },
    inputTokens: { type: Number, default: 0, min: 0 },
    outputTokens: { type: Number, default: 0, min: 0 },
    refs: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

UsageEventSchema.index({ createdAt: -1 });

export type UsageEventDoc = InferSchemaType<typeof UsageEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UsageEventModel = mongoose.model("UsageEvent", UsageEventSchema);
