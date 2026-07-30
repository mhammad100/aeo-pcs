import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function requiredBool(name: string): boolean {
  const value = required(name).toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new Error(`${name} must be true or false`);
}

function optional(name: string): string {
  return process.env[name]?.trim() || "";
}

export const env = {
  port: Number(required("PORT")),
  mongoUri: required("MONGODB_URI"),
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  openaiApiKey: optional("OPENAI_API_KEY"),
  googleAiApiKey: optional("GOOGLE_AI_API_KEY"),
  perplexityApiKey: optional("PERPLEXITY_API_KEY"),
  publicSiteUrl: required("PUBLIC_SITE_URL").replace(/\/$/, ""),
  adminSiteUrl: required("ADMIN_SITE_URL").replace(/\/$/, ""),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: required("JWT_EXPIRES_IN"),
  SIGNUP_ENABLED: requiredBool("SIGNUP_ENABLED"),
};
