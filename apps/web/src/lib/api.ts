import type { AuthUser, LoginRequest, LoginResponse, MeResponse } from "@aeo-pcs/shared";
import { store } from "@/store";
import { logout } from "@/store/authSlice";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = store.getState().auth.token;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    store.dispatch(logout());
  }
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error || "Request failed", res.status);
  }
  return data as T;
}

export const api = {
  login: (body: LoginRequest) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  signup: (body: { email: string; password: string }) =>
    request<LoginResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: () => request<MeResponse>("/auth/me"),

  getMyBusiness: () =>
    request<{ business: import("@aeo-pcs/shared").BusinessProfile }>("/businesses/me"),

  updateMyBusiness: (body: {
    name: string;
    category: string;
    city: string;
    country: string;
    description?: string;
    websiteUrl?: string;
    googleBusinessUrl?: string;
    socialLinks?: { label: string; url: string }[];
  }) =>
    request<{ business: import("@aeo-pcs/shared").BusinessProfile }>("/businesses/me", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  generatePrompts: (body: {
    business: import("@aeo-pcs/shared").BusinessCandidate;
    category: string;
    city: string;
    country: string;
  }) =>
    request<{ prompts: string[] }>("/prompts/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createVisibilityJob: (body: {
    category: string;
    prompts: string[];
  }) =>
    request<{ jobId: string }>("/visibility/jobs", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getVisibilityJob: (jobId: string) =>
    request<
      import("@aeo-pcs/shared").VisibilityJob & {
        plan?: import("@aeo-pcs/shared").ActionPlan;
        itemOutputs?: Record<string, string>;
      }
    >(`/visibility/jobs/${jobId}`),

  listVisibilityJobs: () =>
    request<{ jobs: import("@aeo-pcs/shared").VisibilityJobSummary[] }>("/visibility/jobs"),

  getInsights: () =>
    request<{ insights: import("@aeo-pcs/shared").BusinessInsights }>("/visibility/insights"),

  getRuntimeSettings: () =>
    request<{ settings: import("@aeo-pcs/shared").AeoRuntimeSettings }>("/settings/runtime"),

  getChecklist: () =>
    request<{
      items: import("@aeo-pcs/shared").ChecklistItem[];
      progress: import("@aeo-pcs/shared").ChecklistProgress;
    }>("/action-plan/checklist"),

  patchChecklistItem: (key: string, body: { done?: boolean; note?: string }) =>
    request<{
      item: import("@aeo-pcs/shared").ChecklistItem;
      items: import("@aeo-pcs/shared").ChecklistItem[];
      progress: import("@aeo-pcs/shared").ChecklistProgress;
    }>(`/action-plan/checklist/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  buildPlan: (jobId: string) =>
    request<{ plan: import("@aeo-pcs/shared").ActionPlan }>("/plans", {
      method: "POST",
      body: JSON.stringify({ jobId }),
    }),

  generateItem: (body: {
    jobId: string;
    itemId: string;
    title: string;
    description: string;
  }) =>
    request<{ content: string }>("/plans/items/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getReport: (jobId: string) =>
    request<{ html: string; filename: string }>(`/reports/${jobId}`),

  listCatalogPlans: () =>
    request<{ plans: import("@aeo-pcs/shared").ProductPlan[] }>("/catalog/plans"),

  getMySubscription: () =>
    request<{ subscription: import("@aeo-pcs/shared").SubscriptionInfo }>("/subscriptions/me"),

  subscribeToPlan: (planId: string) =>
    request<{ subscription: import("@aeo-pcs/shared").SubscriptionInfo }>("/subscriptions/subscribe", {
      method: "POST",
      body: JSON.stringify({ planId }),
    }),

  getMyInvoices: () =>
    request<{ invoices: import("@aeo-pcs/shared").InvoiceRecord[] }>("/billing/invoices"),

  getMyUsage: () =>
    request<{
      usage: {
        periodStart: string;
        periodEnd: string;
        totals: {
          calls: number;
          inputTokens: number;
          outputTokens: number;
          estimatedCost: number;
        };
        byFeature: import("@aeo-pcs/shared").UsageSummaryRow[];
      };
    }>("/usage/me"),
};

export type { AuthUser };
