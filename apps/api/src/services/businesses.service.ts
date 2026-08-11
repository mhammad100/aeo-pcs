import { BusinessModel } from "../models/Business";
import { AppError } from "../utils/AppError";
import type { GeoLocation } from "@aeo-pcs/shared";
import {
  headquartersLocation,
  normalizeGeoLocationList,
} from "@aeo-pcs/shared";
import { toBusinessProfile } from "../utils/serialize";

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function profileIsComplete(b: {
  name?: string | null;
  category?: string | null;
  customCategory?: string | null;
  city?: string | null;
  country?: string | null;
  description?: string | null;
  targetItems?: string[] | null;
}): boolean {
  const hasTargetItem = (b.targetItems || []).some((t) => String(t).trim().length > 0);
  const categoryOk =
    b.category?.trim() &&
    (b.category.trim() !== "Other" || (b.customCategory?.trim().length ?? 0) >= 2);
  return Boolean(
    b.name?.trim() &&
      categoryOk &&
      b.country?.trim() &&
      (b.description?.trim().length ?? 0) >= 10 &&
      hasTargetItem
  );
}

export { isValidHttpUrl };

export async function getMyBusiness(userId: string) {
  const business = await BusinessModel.findOne({ ownerUserId: userId });
  if (!business) {
    throw new AppError("Business profile not found", 404);
  }
  return toBusinessProfile(business);
}

export type UpdateBusinessProfileInput = {
  name: string;
  category: string;
  customCategory?: string;
  city?: string;
  state?: string;
  country: string;
  countryCode?: string;
  stateCode?: string;
  description: string;
  nameAliases?: string[];
  targetLocations?: GeoLocation[];
  targetItems?: string[];
  websiteUrl?: string;
  googleBusinessUrl?: string;
  socialLinks?: { label?: string; url?: string }[];
};

function normalizeStringList(values: string[] | undefined, max = 20): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, max);
}

export async function updateMyBusiness(userId: string, input: UpdateBusinessProfileInput) {
  let business = await BusinessModel.findOne({ ownerUserId: userId });
  if (!business) {
    business = new BusinessModel({ ownerUserId: userId });
  }

  const socialLinks = Array.isArray(input.socialLinks)
    ? input.socialLinks
        .filter((s) => s?.label?.trim() && s?.url?.trim())
        .map((s) => ({
          label: String(s.label).trim(),
          url: String(s.url).trim(),
        }))
    : [];

  const hq = headquartersLocation({
    city: input.city || "",
    state: input.state,
    country: input.country,
    countryCode: input.countryCode,
    stateCode: input.stateCode,
  });

  business.name = input.name;
  business.category = input.category;
  business.customCategory =
    input.category.trim() === "Other" ? input.customCategory?.trim() || "" : "";
  business.city = hq.city;
  business.state = hq.state;
  business.country = hq.country;
  business.countryCode = hq.countryCode || "";
  business.stateCode = hq.stateCode || "";
  business.description = input.description.trim();
  business.nameAliases = normalizeStringList(input.nameAliases, 10);

  const targetLocations = normalizeGeoLocationList(input.targetLocations, hq, 15);
  business.set(
    "targetLocations",
    targetLocations.length > 0 ? targetLocations : [{ ...hq }],
  );

  business.targetItems = normalizeStringList(input.targetItems, 20);
  business.websiteUrl = input.websiteUrl?.trim() || "";
  business.googleBusinessUrl = input.googleBusinessUrl || "";
  business.set("socialLinks", socialLinks);

  if (profileIsComplete(business)) {
    if (!business.profileCompletedAt) {
      business.profileCompletedAt = new Date();
    }
  } else {
    business.profileCompletedAt = null;
  }

  await business.save();
  return toBusinessProfile(business);
}
