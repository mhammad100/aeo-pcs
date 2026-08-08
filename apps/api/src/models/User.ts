import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "business"], required: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    sessionId: { type: String, default: null, index: true },
    /** When true, business user may generate action plans while on free-run allowance. */
    canGenerateActionPlanOnFreeRun: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserModel = mongoose.model("User", UserSchema);
