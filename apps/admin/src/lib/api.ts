import type { AuthUser, LoginResponse, MeResponse } from "@aeo-pcs/shared";
import { store } from "@/store";
import { logout } from "@/store/authSlice";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

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
  if (res.status === 401 && token) store.dispatch(logout());
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error || "Request failed", res.status);
  }
  return data as T;
}

export type AdminUserRow = {
  id: string;
  email: string;
  role: string;
  status: string;
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
  login: (body: { email: string; password: string }) =>
    request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<MeResponse>("/auth/me"),
  listUsers: () => request<{ users: AdminUserRow[] }>("/admin/users"),
  listBusinesses: () => request<{ businesses: AdminBusinessRow[] }>("/admin/businesses"),
  createBusinessUser: (body: {
    email: string;
    password: string;
    businessName?: string;
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
};
