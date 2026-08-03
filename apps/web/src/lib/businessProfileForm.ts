import type { BusinessProfileFormValues } from "@/components/BusinessProfileForm";
import type { BusinessProfile } from "@aeo-pcs/shared";

export function profileFormValues(profile: BusinessProfile | null): BusinessProfileFormValues {
  return {
    name: profile?.name || "",
    category: profile?.category || "",
    customCategory: profile?.customCategory || "",
    city: profile?.city || "",
    country: profile?.country || "India",
    description: profile?.description || "",
    nameAliases: profile?.nameAliases?.length ? profile.nameAliases : [],
    targetLocations: profile?.targetLocations?.length ? profile.targetLocations : [],
    targetItems: profile?.targetItems?.length ? profile.targetItems : [],
    websiteUrl: profile?.websiteUrl || "",
    googleBusinessUrl: profile?.googleBusinessUrl || "",
    socialLinks: profile?.socialLinks?.length ? profile.socialLinks : [],
  };
}

export function mergeProfileValues(
  business: BusinessProfile | null,
  partial: BusinessProfileFormValues,
): BusinessProfileFormValues {
  const pick = (value: string | undefined, fallback: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
  };

  return {
    name: pick(partial.name, business?.name ?? ""),
    category: pick(partial.category, business?.category ?? ""),
    customCategory: pick(partial.customCategory, business?.customCategory ?? ""),
    city: pick(partial.city, business?.city ?? ""),
    country: pick(partial.country, business?.country ?? "India"),
    description: pick(partial.description, business?.description ?? ""),
    nameAliases: partial.nameAliases ?? business?.nameAliases ?? [],
    targetLocations: partial.targetLocations ?? business?.targetLocations ?? [],
    targetItems: partial.targetItems ?? business?.targetItems ?? [],
    websiteUrl: pick(partial.websiteUrl, business?.websiteUrl ?? ""),
    googleBusinessUrl: pick(partial.googleBusinessUrl, business?.googleBusinessUrl ?? ""),
    socialLinks: partial.socialLinks ?? business?.socialLinks ?? [],
  };
}

/** API requires city and country on every profile update. */
export function canPersistProfile(values: BusinessProfileFormValues): boolean {
  return Boolean(values.city?.trim() && values.country?.trim());
}

export function normalizeProfilePayload(values: BusinessProfileFormValues) {
  return {
    ...values,
    nameAliases: (values.nameAliases || []).map((s) => s.trim()).filter(Boolean),
    targetLocations: (values.targetLocations || []).map((s) => s.trim()).filter(Boolean),
    targetItems: (values.targetItems || []).map((s) => String(s).trim()).filter(Boolean),
    socialLinks: (values.socialLinks || []).filter((s) => s.label && s.url),
  };
}
