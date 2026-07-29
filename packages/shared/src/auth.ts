export type UserRole = "admin" | "business";

export type UserStatus = "active" | "disabled";

export type SocialLink = {
  label: string;
  url: string;
};

export type BusinessProfile = {
  id: string;
  name: string;
  category: string;
  city: string;
  country: string;
  description: string;
  /** Alternate names for visibility mention matching (e.g. abbreviations). */
  nameAliases: string[];
  /** Service areas / neighborhoods beyond primary city. */
  targetLocations: string[];
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
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type MeResponse = {
  user: AuthUser;
};
