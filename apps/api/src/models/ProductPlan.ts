import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PlanLimitsSchema = new Schema(
  {
    visibilityRunsPerMonth: { type: Number, default: 3, min: 0 },
  },
  { _id: false }
);

const ProductPlanSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD", trim: true, uppercase: true },
    blurb: { type: String, default: "", trim: true },
    features: { type: [String], default: [] },
    limits: { type: PlanLimitsSchema, default: () => ({ visibilityRunsPerMonth: 3 }) },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    priceLabel: { type: String, default: "", trim: true },
    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    razorpayPlanId: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export type ProductPlanDoc = InferSchemaType<typeof ProductPlanSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProductPlanModel = mongoose.model("ProductPlan", ProductPlanSchema);
