import type { Category, LlmProvider } from "./constants";

export type BusinessCandidate = {
  name: string;
  category: string;
  address: string;
  description: string;
};

export type Source = {
  domain: string;
  url: string;
  title: string;
};

export type ModelPricing = {
  inputPer1MTokens: number;
  outputPer1MTokens: number;
  currency: string;
};

export type VisibilityModelConfig = {
  id: string;
  label: string;
  provider: LlmProvider;
  modelId: string;
  enabled: boolean;
  inputPer1MTokens: number;
  outputPer1MTokens: number;
  currency: string;
};

export type TaskModelConfig = {
  provider: LlmProvider;
  modelId: string;
  enabled: boolean;
  inputPer1MTokens: number;
  outputPer1MTokens: number;
  currency: string;
};

export type AeoSettings = {
  visibilityModels: VisibilityModelConfig[];
  promptGenerationModel: TaskModelConfig;
  actionPlanModel: TaskModelConfig;
  promptsPerRun: number;
  updatedAt?: string;
};

export type AeoRuntimeSettings = {
  promptsPerRun: number;
  visibilityModelCount: number;
  visibilityModels: Array<{ id: string; label: string; provider: LlmProvider }>;
};

export type ModelResult = {
  model: string;
  answer: string;
  mentioned: boolean;
  sources: Source[];
};

export type PromptResult = {
  prompt: string;
  perModel: ModelResult[];
};

export type VisibilityScore = {
  visibilityPct: number;
  totalMentions: number;
  totalChecks: number;
};

export type AutomatableItem = {
  id: string;
  title: string;
  description: string;
};

export type ManualItem = {
  title: string;
  guidance: string;
};

export type ActionPlan = {
  automatable: AutomatableItem[];
  manual: ManualItem[];
};

export type JobStatus = "queued" | "running" | "completed" | "failed";

export type VisibilityJobProgress = {
  completed: number;
  total: number;
  currentPrompt?: string;
  currentModel?: string;
};

export type VisibilityJob = {
  id: string;
  status: JobStatus;
  progress: VisibilityJobProgress;
  business: BusinessCandidate;
  category: Category | string;
  city: string;
  country: string;
  prompts: string[];
  results?: PromptResult[];
  score?: VisibilityScore;
  plan?: ActionPlan;
  itemOutputs?: Record<string, string>;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type SearchBusinessRequest = {
  name: string;
  city: string;
  country: string;
};

export type SearchBusinessResponse = {
  candidates: BusinessCandidate[];
};

export type GeneratePromptsRequest = {
  business: BusinessCandidate;
  category: string;
  city: string;
  country: string;
};

export type GeneratePromptsResponse = {
  prompts: string[];
};

export type CreateVisibilityJobRequest = {
  business: BusinessCandidate;
  category: string;
  city: string;
  country: string;
  prompts: string[];
};

export type CreateVisibilityJobResponse = {
  jobId: string;
};

export type BuildPlanRequest = {
  jobId: string;
};

export type BuildPlanResponse = {
  plan: ActionPlan;
};

export type GenerateItemRequest = {
  jobId: string;
  itemId: string;
  title: string;
  description: string;
};

export type GenerateItemResponse = {
  content: string;
};

export type ReportResponse = {
  html: string;
  filename: string;
};

export type ChecklistItemKind = "automatable" | "manual";

export type ChecklistItem = {
  key: string;
  kind: ChecklistItemKind;
  title: string;
  guidance?: string;
  done: boolean;
  doneAt?: string | null;
  note?: string;
  sourceJobId?: string;
};

export type ChecklistProgress = {
  total: number;
  done: number;
  percent: number;
};

export type VisibilityJobSummary = {
  id: string;
  status: JobStatus;
  score?: VisibilityScore;
  createdAt: string;
  hasPlan: boolean;
};

export type BusinessInsights = {
  latestScore: VisibilityScore | null;
  currentMonthScore: VisibilityScore | null;
  previousMonthScore: VisibilityScore | null;
  scoreDelta: number | null;
  checklist: ChecklistProgress;
  recentJobs: VisibilityJobSummary[];
};

export type ProductPlanLimits = {
  visibilityRunsPerMonth: number;
};

export type ProductPlan = {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  priceLabel?: string;
  blurb: string;
  features: string[];
  limits: ProductPlanLimits;
  active: boolean;
  sortOrder: number;
};

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";

export type SubscriptionInfo = {
  id: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  note?: string;
  plan: ProductPlan | null;
  runsUsedThisPeriod: number;
  runsLimit: number;
};

export type InvoiceRecord = {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void";
  periodLabel: string;
  note?: string;
  createdAt: string;
};

export type CostRate = {
  id: string;
  model: string;
  inputPer1MTokens: number;
  outputPer1MTokens: number;
  currency: string;
};

export type UsageSummaryRow = {
  key: string;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  estimatedCost: number;
};

export type UsageProfitSummary = {
  periodStart: string;
  periodEnd: string;
  totals: {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
    subscriptionRevenue: number;
    margin: number;
  };
  byFeature: UsageSummaryRow[];
  byModel: UsageSummaryRow[];
  byDay: UsageSummaryRow[];
  costRates: CostRate[];
};

