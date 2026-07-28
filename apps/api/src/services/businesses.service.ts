import { BusinessModel } from "../models/Business";
import { AppError } from "../utils/AppError";
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
  city?: string | null;
  country?: string | null;
  websiteUrl?: string | null;
}): boolean {
  return Boolean(
    b.name?.trim() &&
      b.category?.trim() &&
      b.city?.trim() &&
      b.country?.trim() &&
      b.websiteUrl?.trim() &&
      isValidHttpUrl(b.websiteUrl.trim())
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
  city: string;
  country: string;
  description?: string;
  websiteUrl: string;
  googleBusinessUrl?: string;
  socialLinks?: { label?: string; url?: string }[];
};

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

  business.name = input.name;
  business.category = input.category;
  business.city = input.city;
  business.country = input.country;
  business.description = input.description || "";
  business.websiteUrl = input.websiteUrl;
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
