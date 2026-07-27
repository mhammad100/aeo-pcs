import mongoose, { Schema, type InferSchemaType } from "mongoose";

const SocialLinkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const BusinessSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, default: "", trim: true },
    category: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    websiteUrl: { type: String, default: "", trim: true },
    googleBusinessUrl: { type: String, default: "", trim: true },
    socialLinks: { type: [SocialLinkSchema], default: [] },
    profileCompletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type BusinessDoc = InferSchemaType<typeof BusinessSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BusinessModel = mongoose.model("Business", BusinessSchema);
