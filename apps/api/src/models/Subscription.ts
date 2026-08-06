import mongoose, { Schema, type InferSchemaType } from "mongoose";

const SubscriptionSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "ProductPlan", required: true, index: true },
    status: {
      type: String,
      enum: ["active", "canceled", "past_due", "trialing", "incomplete"],
      default: "incomplete",
      index: true,
    },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    note: { type: String, default: "", trim: true },
    razorpaySubscriptionId: { type: String, default: "", trim: true, index: true },
    razorpayCustomerId: { type: String, default: "", trim: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ businessId: 1, status: 1 });

export type SubscriptionDoc = InferSchemaType<typeof SubscriptionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SubscriptionModel = mongoose.model("Subscription", SubscriptionSchema);
