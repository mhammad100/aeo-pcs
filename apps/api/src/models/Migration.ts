import mongoose, { Schema } from "mongoose";

const MigrationSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const MigrationModel = mongoose.model("Migration", MigrationSchema);
