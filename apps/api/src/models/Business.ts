import mongoose, { Schema, type InferSchemaType } from "mongoose";

const SocialLinkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const GeoLocationSchema = new Schema(
  {
    // Target locations: country required; state and city optional (broader markets).
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    country: { type: String, required: true, trim: true },
    countryCode: { type: String, default: "", trim: true },
    stateCode: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const ChecklistItemSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    kind: { type: String, enum: ["automatable", "manual"], required: true },
    title: { type: String, required: true, trim: true },
    guidance: { type: String, default: "", trim: true },
    done: { type: Boolean, default: false },
    doneAt: { type: Date, default: null },
    note: { type: String, default: "", trim: true },
    sourceJobId: { type: Schema.Types.ObjectId, ref: "VisibilityJob", default: null },
  },
  { _id: false }
);

const BusinessSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, default: "", trim: true },
    category: { type: String, default: "", trim: true },
    customCategory: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    countryCode: { type: String, default: "", trim: true },
    stateCode: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    nameAliases: { type: [String], default: [] },
    targetLocations: { type: [GeoLocationSchema], default: [] },
    targetItems: { type: [String], default: [] },
    websiteUrl: { type: String, default: "", trim: true },
    googleBusinessUrl: { type: String, default: "", trim: true },
    socialLinks: { type: [SocialLinkSchema], default: [] },
    checklist: { type: [ChecklistItemSchema], default: [] },
    profileCompletedAt: { type: Date, default: null },
    razorpayCustomerId: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export type BusinessDoc = InferSchemaType<typeof BusinessSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BusinessModel = mongoose.model("Business", BusinessSchema);
