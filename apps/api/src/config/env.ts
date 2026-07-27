import path from "path";
import dotenv from "dotenv";

// Resolve from this file so it works whether cwd is repo root or apps/api
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(required("PORT")),
  mongoUri: required("MONGODB_URI"),
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  anthropicModel: required("ANTHROPIC_MODEL"),
  corsOrigin: required("CORS_ORIGIN"),
};
