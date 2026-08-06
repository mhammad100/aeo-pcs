import mongoose, { Schema, type InferSchemaType } from "mongoose";

const InvoiceSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription", default: null },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD", uppercase: true },
    status: {
      type: String,
      enum: ["paid", "open", "void"],
      default: "paid",
      index: true,
    },
    periodLabel: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    razorpayPaymentId: { type: String, default: "", trim: true, index: true },
    razorpayInvoiceId: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export type InvoiceDoc = InferSchemaType<typeof InvoiceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const InvoiceModel = mongoose.model("Invoice", InvoiceSchema);
