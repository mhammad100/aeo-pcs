import type { Category, ModelLabel } from "./constants";

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

export type ModelResult = {
  model: ModelLabel | string;
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
