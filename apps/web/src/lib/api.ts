const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error || "Request failed", res.status);
  }
  return data as T;
}

export const api = {
  searchBusiness: (body: { name: string; city: string; country: string }) =>
    request<{ candidates: import("@aeo-pcs/shared").BusinessCandidate[] }>("/business/search", {
      method: "POST",
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
    business: import("@aeo-pcs/shared").BusinessCandidate;
    category: string;
    city: string;
    country: string;
    prompts: string[];
  }) =>
    request<{ jobId: string }>("/visibility/jobs", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getVisibilityJob: (jobId: string) =>
    request<import("@aeo-pcs/shared").VisibilityJob & { plan?: import("@aeo-pcs/shared").ActionPlan; itemOutputs?: Record<string, string> }>(
      `/visibility/jobs/${jobId}`
    ),

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
};
