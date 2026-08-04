import type {
  AuthUser,
  LoginConflictDetails,
  LoginRequest,
  LoginResponse,
  MeResponse,
} from "@aeo-pcs/shared";
import { store } from "@/store";
import { logoutAndReset } from "@/store/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: LoginConflictDetails & Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: LoginConflictDetails & Record<string, unknown>
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
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
  const code = (data as { code?: string }).code;
  const details = (data as { details?: LoginConflictDetails & Record<string, unknown> }).details;

  if (res.status === 401 && token) {
    if (code === "SESSION_REVOKED") {
      sessionStorage.setItem("auth-session-revoked", "1");
    }
    void store.dispatch(logoutAndReset({ revokeServer: false }));
  }
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error || "Request failed",
      res.status,
      code,
      details
    );
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

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getMyBusiness: () =>
    request<{ business: import("@aeo-pcs/shared").BusinessProfile }>("/businesses/me"),

  getGeoCountries: () =>
    request<{ countries: import("@aeo-pcs/shared").GeoCountryOption[] }>("/geo/countries"),

  getGeoStates: (countryCode: string) =>
    request<{ states: import("@aeo-pcs/shared").GeoStateOption[] }>(
      `/geo/states?countryCode=${encodeURIComponent(countryCode)}`,
    ),

  getGeoCities: (countryCode: string, stateCode?: string) =>
    request<{ cities: import("@aeo-pcs/shared").GeoCityOption[] }>(
      `/geo/cities?countryCode=${encodeURIComponent(countryCode)}${
        stateCode ? `&stateCode=${encodeURIComponent(stateCode)}` : ""
      }`,
    ),

  updateMyBusiness: (body: {
    name: string;
    category: string;
    customCategory?: string;
    city: string;
    state?: string;
    country: string;
    countryCode?: string;
    stateCode?: string;
    description: string;
    nameAliases?: string[];
    targetLocations?: import("@aeo-pcs/shared").GeoLocation[];
    targetItems?: string[];
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
    state?: string;
    country: string;
  }) =>
    request<{ prompts: string[] }>("/prompts/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  startVisibilityJob: (body: { category: string; prompts?: string[] }) =>
    request<{ job: import("@aeo-pcs/shared").VisibilityJob }>("/visibility/jobs/start", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  runVisibilityJob: (jobId: string, body: { prompts: string[] }) =>
    request<{
      jobId: string;
      job: import("@aeo-pcs/shared").VisibilityJob;
    }>(`/visibility/jobs/${encodeURIComponent(jobId)}/run`, {
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

  getActiveVisibilityJob: () =>
    request<{
      job: (import("@aeo-pcs/shared").VisibilityJob & {
        plan?: import("@aeo-pcs/shared").ActionPlan;
        itemOutputs?: Record<string, string>;
      }) | null;
    }>("/visibility/jobs/active"),

  cancelVisibilityJob: (jobId: string) =>
    request<{
      job: import("@aeo-pcs/shared").VisibilityJob & {
        plan?: import("@aeo-pcs/shared").ActionPlan;
        itemOutputs?: Record<string, string>;
      };
    }>(`/visibility/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  getVisibilityJob: (jobId: string) =>
    request<
      import("@aeo-pcs/shared").VisibilityJob & {
        plan?: import("@aeo-pcs/shared").ActionPlan;
        itemOutputs?: Record<string, string>;
      }
    >(`/visibility/jobs/${jobId}`),

  visibilityJobStreamUrl: (jobId: string) => {
    const token = store.getState().auth.token;
    const base = API_URL.replace(/\/$/, "");
    const params = new URLSearchParams();
    if (token) params.set("token", token);
    const qs = params.toString();
    return `${base}/visibility/jobs/${encodeURIComponent(jobId)}/stream${qs ? `?${qs}` : ""}`;
  },

  listVisibilityJobs: (params?: { limit?: number; status?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.status) search.set("status", params.status);
    const qs = search.toString();
    return request<{ jobs: import("@aeo-pcs/shared").VisibilityJobSummary[] }>(
      `/visibility/jobs${qs ? `?${qs}` : ""}`
    );
  },

  getInsights: () =>
    request<{ insights: import("@aeo-pcs/shared").BusinessInsights }>("/visibility/insights"),

  getRuntimeSettings: () =>
    request<{ settings: import("@aeo-pcs/shared").AeoRuntimeSettings }>("/settings/runtime"),

  getChecklist: () =>
    request<import("@aeo-pcs/shared").ChecklistResponse>("/action-plan/checklist"),

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

  getReport: async (jobId: string, format: "pdf" | "html" = "pdf") => {
    const token = store.getState().auth.token;
    const res = await fetch(`${API_URL}/reports/${jobId}?format=${format}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.status === 401 && token) {
      void store.dispatch(logoutAndReset({ revokeServer: false }));
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError((data as { error?: string }).error || "Report download failed", res.status);
    }
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] || `ai-visibility-report.pdf`;

    if (format === "pdf") {
      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("application/pdf")) {
        const data = await res.arrayBuffer();
        return {
          data,
          filename,
          contentType: "application/pdf" as const,
        };
      }
      const json = (await res.json()) as { html?: string; filename: string; contentType: string };
      return {
        data: json.html || "",
        filename: json.filename,
        contentType: "text/html" as const,
      };
    }

    const json = (await res.json()) as { html?: string; filename: string; contentType: string };
    return {
      data: json.html || "",
      filename: json.filename,
      contentType: "text/html" as const,
    };
  },

  listCatalogPlans: () =>
    request<{ plans: import("@aeo-pcs/shared").ProductPlan[] }>("/catalog/plans"),

  getMySubscription: () =>
    request<{ subscription: import("@aeo-pcs/shared").SubscriptionInfo }>("/subscriptions/me"),

  subscribeToPlan: (planId: string) =>
    request<{
      subscription: import("@aeo-pcs/shared").SubscriptionInfo;
      invoice: import("@aeo-pcs/shared").InvoiceRecord | null;
    }>("/subscriptions/subscribe", {
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
