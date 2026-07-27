import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CostRateSchema = new Schema(
  {
    model: { type: String, required: true, trim: true, unique: true },
    inputPer1MTokens: { type: Number, required: true, min: 0 },
    outputPer1MTokens: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", uppercase: true },
  },
  { timestamps: true }
);

export type CostRateDoc = InferSchemaType<typeof CostRateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CostRateModel = mongoose.model("CostRate", CostRateSchema);
