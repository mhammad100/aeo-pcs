export type UserRole = "admin" | "business";

export type UserStatus = "active" | "disabled";

import type { GeoLocation } from "./geo";

export type SocialLink = {
  label: string;
  url: string;
};

export type BusinessProfile = {
  id: string;
  name: string;
  category: string;
  /** Free-text type when category is "Other". */
  customCategory?: string;
  city: string;
  state: string;
  country: string;
  countryCode?: string;
  stateCode?: string;
  description: string;
  /** Alternate names for visibility mention matching (e.g. abbreviations). */
  nameAliases: string[];
  /** Service areas beyond headquarters — each with city, state, and country. */
  targetLocations: GeoLocation[];
  /** Products or services to target in buyer-intent prompts. */
  targetItems: string[];
  websiteUrl: string;
  googleBusinessUrl?: string;
  socialLinks: SocialLink[];
  profileCompletedAt: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  business: BusinessProfile | null;
};

export type LoginRequest = {
  email: string;
  password: string;
  /** When true, replaces the active session on another device. */
  revokeOtherSession?: boolean;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type LoginConflictDetails = {
  visibilityRunInProgress: boolean;
  activeJobId?: string;
};

export type MeResponse = {
  user: AuthUser;
};
