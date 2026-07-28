import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { connectMongo } from "./config/db";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";

async function main() {
  await connectMongo();
  const { ensureDefaultPlans } = await import("./services/productPlans.service");
  const { ensureDefaultCostRates } = await import("./services/usage.service");
  await ensureDefaultPlans();
  await ensureDefaultCostRates();
  const { resumeInterruptedVisibilityJobs } = await import("./services/jobRunner");
  await resumeInterruptedVisibilityJobs();

  const app = express();
  app.use(
    cors({
      origin: env.corsOrigin.split(",").map((s) => s.trim()),
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const expensiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many expensive requests, try again later." },
  });

  app.use("/api/v1", generalLimiter);
  app.post("/api/v1/business/search", expensiveLimiter);
  app.post("/api/v1/prompts/generate", expensiveLimiter);
  app.post("/api/v1/visibility/jobs", expensiveLimiter);
  app.post("/api/v1/plans", expensiveLimiter);
  app.post("/api/v1/plans/items/generate", expensiveLimiter);

  app.use("/api/v1", apiRouter);
  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start API", err);
  process.exit(1);
});
