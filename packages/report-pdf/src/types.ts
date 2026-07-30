import type {
  ActionPlan,
  BusinessCandidate,
  PromptResult,
  VisibilityScore,
} from "@aeo-pcs/shared";

export type VisibilityReportInput = {
  selected: BusinessCandidate | null;
  category: string;
  city: string;
  country: string;
  results?: PromptResult[] | null;
  score?: VisibilityScore | null;
  plan?: ActionPlan | null;
  itemOutputs?: Record<string, string>;
  generatedAt?: Date;
  jobError?: string | null;
};
