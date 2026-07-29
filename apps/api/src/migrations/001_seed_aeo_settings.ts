/**
 * Migration 001: seed AeoSettings singleton, sync CostRate rows for configured
 * models, and tag legacy Claude-simulated visibility usage events.
 */
import { CostRateModel } from "../models/CostRate";
import { UsageEventModel } from "../models/UsageEvent";
import {
  defaultAeoSettings,
  ensureAeoSettings,
} from "../services/aeoSettings.service";
import { upsertCostRate } from "../services/usage.service";

export const name = "001_seed_aeo_settings";

export async function up() {
  const settings = await ensureAeoSettings();
  console.log(
    `  AeoSettings ready (${settings.visibilityModels.length} visibility models, promptsPerRun=${settings.promptsPerRun})`
  );

  const defaults = defaultAeoSettings();
  const allModels = [
    ...defaults.visibilityModels.map((m) => ({
      model: m.modelId,
      inputPer1MTokens: m.inputPer1MTokens,
      outputPer1MTokens: m.outputPer1MTokens,
      currency: m.currency,
    })),
    {
      model: defaults.promptGenerationModel.modelId,
      inputPer1MTokens: defaults.promptGenerationModel.inputPer1MTokens,
      outputPer1MTokens: defaults.promptGenerationModel.outputPer1MTokens,
      currency: defaults.promptGenerationModel.currency,
    },
    {
      model: defaults.actionPlanModel.modelId,
      inputPer1MTokens: defaults.actionPlanModel.inputPer1MTokens,
      outputPer1MTokens: defaults.actionPlanModel.outputPer1MTokens,
      currency: defaults.actionPlanModel.currency,
    },
  ];

  for (const rate of allModels) {
    await upsertCostRate(rate);
  }
  console.log(`  Synced ${allModels.length} CostRate rows from default model pricing`);

  const tagged = await UsageEventModel.updateMany(
    {
      feature: "visibility",
      "refs.visibilityModelId": { $exists: false },
    },
    {
      $set: { "refs.legacySimulated": true },
    }
  );
  console.log(`  Tagged ${tagged.modifiedCount} legacy visibility UsageEvent(s)`);

  // Keep historical CostRate docs; do not delete. New rates are additive.
  const rateCount = await CostRateModel.countDocuments();
  console.log(`  CostRate collection now has ${rateCount} document(s)`);
}
