import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aeo-pcs",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
};

export function assertAnthropicConfigured() {
  if (!env.anthropicApiKey || env.anthropicApiKey === "your_anthropic_api_key_here") {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
}
