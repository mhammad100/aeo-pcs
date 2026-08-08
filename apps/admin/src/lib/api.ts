import type { AuthUser, LoginRequest, LoginResponse, MeResponse } from "@aeo-pcs/shared";
import { store } from "@/store";
import { logout } from "@/store/authSlice";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;
  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
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
  const details = (data as { details?: Record<string, unknown> }).details;
  if (res.status === 401 && token) store.dispatch(logout());
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

export type AdminUserRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  canGenerateActionPlanOnFreeRun: boolean;
  createdAt: string;
  business: { id: string; name: string; profileCompletedAt: string | null } | null;
};

export type AdminBusinessRow = {
  id: string;
  name: string;
  category: string;
  city: string;
  country: string;
  websiteUrl: string;
  profileCompletedAt: string | null;
  ownerEmail: string | null;
  createdAt: string;
};

export const api = {
  login: (body: LoginRequest) =>
    request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST", body: "{}" }),
  me: () => request<MeResponse>("/auth/me"),
  listUsers: () => request<{ users: AdminUserRow[] }>("/admin/users"),
  listBusinesses: () => request<{ businesses: AdminBusinessRow[] }>("/admin/businesses"),
  createBusinessUser: (body: {
    email: string;
    password: string;
    businessName?: string;
    canGenerateActionPlanOnFreeRun?: boolean;
  }) =>
    request<{ user: AuthUser }>("/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setUserStatus: (userId: string, status: "active" | "disabled") =>
    request<{ ok: boolean }>(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  listAdminPlans: () => request<{ plans: AdminPlan[] }>("/admin/plans"),
  createAdminPlan: (body: CreatePlanBody) =>
    request<{ plan: AdminPlan; migration: PlanMigrationResult | null }>("/admin/plans", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAdminPlan: (planId: string, body: Partial<CreatePlanBody>) =>
    request<{ plan: AdminPlan; migration: PlanMigrationResult | null }>(`/admin/plans/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAdminPlan: (planId: string) =>
    request<{ ok: boolean }>(`/admin/plans/${planId}`, { method: "DELETE" }),
  listAdminSubscriptions: () =>
    request<{
      subscriptions: Array<{
        id: string;
        status: string;
        businessId: string;
        businessName: string;
        plan: AdminPlan | null;
      }>;
    }>("/admin/subscriptions"),
  getUsageSummary: (days = 30) =>
    request<{ summary: import("@aeo-pcs/shared").UsageProfitSummary }>(
      `/admin/usage/summary?days=${days}`
    ),
  getAeoSettings: () =>
    request<{ settings: import("@aeo-pcs/shared").AeoSettings }>("/admin/settings"),
  updateAeoSettings: (body: Partial<import("@aeo-pcs/shared").AeoSettings>) =>
    request<{ settings: import("@aeo-pcs/shared").AeoSettings }>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

export type AdminPlan = {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  priceLabel?: string;
  billingPeriod: "monthly" | "yearly";
  blurb: string;
  features: string[];
  limits: { visibilityRunsPerMonth: number };
  active: boolean;
  sortOrder: number;
  razorpayPlanId?: string;
};

export type PlanMigrationResult = {
  scheduled: number;
  failed: number;
  errors: string[];
};

type CreatePlanBody = {
  name: string;
  slug?: string;
  price: number;
  currency?: string;
  priceLabel?: string;
  billingPeriod?: "monthly" | "yearly";
  blurb?: string;
  features?: string[];
  visibilityRunsPerMonth?: number;
  active?: boolean;
  sortOrder?: number;
  razorpayPlanId?: string;
};
