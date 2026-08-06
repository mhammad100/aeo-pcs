import type { BusinessProfileFormValues } from "@/components/BusinessProfileForm";
import type { BusinessProfile, GeoLocation } from "@aeo-pcs/shared";
import { headquartersLocation } from "@aeo-pcs/shared";
import { geoLocationFromValue } from "@/lib/geo";

export function profileHeadquarters(profile: BusinessProfile | null): GeoLocation {
  if (!profile) return geoLocationFromValue(null);
  return headquartersLocation({
    city: profile.city,
    state: profile.state,
    country: profile.country,
    countryCode: profile.countryCode,
    stateCode: profile.stateCode,
  });
}

export function profileFormValues(profile: BusinessProfile | null): BusinessProfileFormValues {
  const hq = profileHeadquarters(profile);
  return {
    name: profile?.name || "",
    category: profile?.category || "",
    customCategory: profile?.customCategory || "",
    city: hq.city,
    state: hq.state,
    country: hq.country,
    countryCode: hq.countryCode,
    stateCode: hq.stateCode,
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

  const hq = profileHeadquarters(business);

  return {
    name: pick(partial.name, business?.name ?? ""),
    category: pick(partial.category, business?.category ?? ""),
    customCategory: pick(partial.customCategory, business?.customCategory ?? ""),
    city: pick(partial.city, hq.city),
    state: pick(partial.state, hq.state),
    country: pick(partial.country, hq.country),
    countryCode: partial.countryCode || business?.countryCode || hq.countryCode,
    stateCode: partial.stateCode || business?.stateCode || hq.stateCode,
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
    targetLocations: (values.targetLocations || [])
      .filter((loc) => loc.country?.trim())
      .map((loc) => ({
        city: loc.city?.trim() || "",
        state: loc.state?.trim() || "",
        country: loc.country.trim(),
        countryCode: loc.countryCode?.trim() || undefined,
        stateCode: loc.stateCode?.trim() || undefined,
      })),
    targetItems: (values.targetItems || []).map((s) => String(s).trim()).filter(Boolean),
    socialLinks: (values.socialLinks || []).filter((s) => s.label && s.url),
  };
}
