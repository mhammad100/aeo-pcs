import type { AuthUser, BusinessProfile } from "@aeo-pcs/shared";
import type { BusinessDoc } from "../models/Business";
import type { UserDoc } from "../models/User";

export function toBusinessProfile(business: BusinessDoc | null): BusinessProfile | null {
  if (!business) return null;
  return {
    id: String(business._id),
    name: business.name || "",
    category: business.category || "",
    city: business.city || "",
    country: business.country || "",
    description: business.description || "",
    nameAliases: (business.nameAliases || []).map(String),
    targetLocations: (business.targetLocations || []).map(String),
    targetItems: (business.targetItems || []).map(String),
    websiteUrl: business.websiteUrl || "",
    googleBusinessUrl: business.googleBusinessUrl || undefined,
    socialLinks: (business.socialLinks || []).map((s) => ({
      label: s.label,
      url: s.url,
    })),
    profileCompletedAt: business.profileCompletedAt
      ? new Date(business.profileCompletedAt).toISOString()
      : null,
  };
}

export function toAuthUser(user: UserDoc, business: BusinessDoc | null): AuthUser {
  return {
    id: String(user._id),
    email: user.email,
    role: user.role as AuthUser["role"],
    status: user.status as AuthUser["status"],
    business: toBusinessProfile(business),
  };
}
