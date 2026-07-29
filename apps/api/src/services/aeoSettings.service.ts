import {
  DEFAULT_PROMPTS_PER_RUN,
  MAX_PROMPTS_PER_RUN,
  type AeoRuntimeSettings,
  type AeoSettings,
  type TaskModelConfig,
  type VisibilityModelConfig,
} from "@aeo-pcs/shared";
import { AeoSettingsModel } from "../models/AeoSettings";
import { AppError } from "../utils/AppError";
import { upsertCostRate } from "./usage.service";

const SETTINGS_KEY = "default";

export function defaultAeoSettings(): Omit<AeoSettings, "updatedAt"> {
  return {
    visibilityModels: [
      {
        id: "gemini",
        label: "Gemini",
        provider: "google",
        modelId: "gemini-3.5-flash-lite",
        enabled: true,
        inputPer1MTokens: 0.1,
        outputPer1MTokens: 0.4,
        currency: "USD",
      },
      {
        id: "openai",
        label: "ChatGPT",
        provider: "openai",
        modelId: "gpt-5o-mini",
        enabled: true,
        inputPer1MTokens: 0.15,
        outputPer1MTokens: 0.6,
        currency: "USD",
      },
      {
        id: "perplexity",
        label: "Perplexity",
        provider: "perplexity",
        modelId: "sonar",
        enabled: true,
        inputPer1MTokens: 1,
        outputPer1MTokens: 1,
        currency: "USD",
      },
    ],
    promptGenerationModel: {
      provider: "openai",
      modelId: "gpt-4.1-mini",
      enabled: true,
      inputPer1MTokens: 0.4,
      outputPer1MTokens: 1.6,
      currency: "USD",
    },
    actionPlanModel: {
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      enabled: true,
      inputPer1MTokens: 3,
      outputPer1MTokens: 15,
      currency: "USD",
    },
    promptsPerRun: DEFAULT_PROMPTS_PER_RUN,
  };
}

function serializeTask(model: TaskModelConfig): TaskModelConfig {
  return {
    provider: model.provider,
    modelId: model.modelId,
    enabled: model.enabled !== false,
    inputPer1MTokens: model.inputPer1MTokens,
    outputPer1MTokens: model.outputPer1MTokens,
    currency: (model.currency || "USD").toUpperCase(),
  };
}

function serializeVisibility(model: VisibilityModelConfig): VisibilityModelConfig {
  return {
    id: model.id,
    label: model.label,
    provider: model.provider,
    modelId: model.modelId,
    enabled: model.enabled !== false,
    inputPer1MTokens: model.inputPer1MTokens,
    outputPer1MTokens: model.outputPer1MTokens,
    currency: (model.currency || "USD").toUpperCase(),
  };
}

function serializeSettings(doc: {
  visibilityModels?: VisibilityModelConfig[] | null;
  promptGenerationModel?: TaskModelConfig | null;
  actionPlanModel?: TaskModelConfig | null;
  promptsPerRun?: number | null;
  updatedAt?: Date | string | null;
}): AeoSettings {
  const defaults = defaultAeoSettings();
  return {
    visibilityModels: (doc.visibilityModels?.length
      ? doc.visibilityModels
      : defaults.visibilityModels
    ).map(serializeVisibility),
    promptGenerationModel: serializeTask(
      doc.promptGenerationModel || defaults.promptGenerationModel
    ),
    actionPlanModel: serializeTask(doc.actionPlanModel || defaults.actionPlanModel),
    promptsPerRun: doc.promptsPerRun || defaults.promptsPerRun,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

async function syncCostRatesFromSettings(settings: AeoSettings) {
  const models: Array<{ model: string; input: number; output: number; currency: string }> = [
    ...settings.visibilityModels.map((m) => ({
      model: m.modelId,
      input: m.inputPer1MTokens,
      output: m.outputPer1MTokens,
      currency: m.currency,
    })),
    {
      model: settings.promptGenerationModel.modelId,
      input: settings.promptGenerationModel.inputPer1MTokens,
      output: settings.promptGenerationModel.outputPer1MTokens,
      currency: settings.promptGenerationModel.currency,
    },
    {
      model: settings.actionPlanModel.modelId,
      input: settings.actionPlanModel.inputPer1MTokens,
      output: settings.actionPlanModel.outputPer1MTokens,
      currency: settings.actionPlanModel.currency,
    },
  ];

  for (const m of models) {
    await upsertCostRate({
      model: m.model,
      inputPer1MTokens: m.input,
      outputPer1MTokens: m.output,
      currency: m.currency,
    });
  }
}

export async function ensureAeoSettings(): Promise<AeoSettings> {
  const existing = await AeoSettingsModel.findOne({ key: SETTINGS_KEY }).lean();
  if (existing) {
    return serializeSettings(existing as never);
  }

  const defaults = defaultAeoSettings();
  const created = await AeoSettingsModel.create({
    key: SETTINGS_KEY,
    ...defaults,
  });
  const settings = serializeSettings(created.toObject() as never);
  await syncCostRatesFromSettings(settings);
  return settings;
}

export async function getAeoSettings(): Promise<AeoSettings> {
  return ensureAeoSettings();
}

export async function getRuntimeAeoSettings(): Promise<AeoRuntimeSettings> {
  const settings = await ensureAeoSettings();
  const enabled = settings.visibilityModels.filter((m) => m.enabled);
  return {
    promptsPerRun: settings.promptsPerRun,
    visibilityModelCount: enabled.length,
    visibilityModels: enabled.map((m) => ({
      id: m.id,
      label: m.label,
      provider: m.provider,
    })),
  };
}

export async function getEnabledVisibilityModels(): Promise<VisibilityModelConfig[]> {
  const settings = await ensureAeoSettings();
  const enabled = settings.visibilityModels.filter((m) => m.enabled);
  if (!enabled.length) {
    throw new AppError("No visibility models are enabled. Update AEO settings in admin.", 500);
  }
  return enabled;
}

export async function updateAeoSettings(input: Partial<{
  visibilityModels: VisibilityModelConfig[];
  promptGenerationModel: TaskModelConfig;
  actionPlanModel: TaskModelConfig;
  promptsPerRun: number;
}>): Promise<AeoSettings> {
  await ensureAeoSettings();

  const $set: Record<string, unknown> = {};

  if (input.visibilityModels) {
    if (!Array.isArray(input.visibilityModels) || input.visibilityModels.length < 1) {
      throw new AppError("At least one visibility model is required", 400);
    }
    const ids = new Set<string>();
    for (const m of input.visibilityModels) {
      if (!m.id?.trim() || !m.label?.trim() || !m.modelId?.trim()) {
        throw new AppError("Each visibility model needs id, label, and modelId", 400);
      }
      if (ids.has(m.id)) {
        throw new AppError(`Duplicate visibility model id: ${m.id}`, 400);
      }
      ids.add(m.id);
    }
    if (!input.visibilityModels.some((m) => m.enabled !== false)) {
      throw new AppError("At least one visibility model must be enabled", 400);
    }
    $set.visibilityModels = input.visibilityModels.map(serializeVisibility);
  }

  if (input.promptGenerationModel) {
    if (!input.promptGenerationModel.modelId?.trim()) {
      throw new AppError("promptGenerationModel.modelId is required", 400);
    }
    $set.promptGenerationModel = serializeTask(input.promptGenerationModel);
  }

  if (input.actionPlanModel) {
    if (!input.actionPlanModel.modelId?.trim()) {
      throw new AppError("actionPlanModel.modelId is required", 400);
    }
    $set.actionPlanModel = serializeTask(input.actionPlanModel);
  }

  if (input.promptsPerRun != null) {
    const n = Number(input.promptsPerRun);
    if (!Number.isInteger(n) || n < 1 || n > MAX_PROMPTS_PER_RUN) {
      throw new AppError(`promptsPerRun must be an integer from 1 to ${MAX_PROMPTS_PER_RUN}`, 400);
    }
    $set.promptsPerRun = n;
  }

  if (!Object.keys($set).length) {
    return getAeoSettings();
  }

  const updated = await AeoSettingsModel.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set },
    { new: true }
  ).lean();

  if (!updated) {
    throw new AppError("Failed to update settings", 500);
  }

  const settings = serializeSettings(updated as never);
  await syncCostRatesFromSettings(settings);
  return settings;
}
