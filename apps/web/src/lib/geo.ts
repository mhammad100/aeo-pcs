import type { GeoLocation } from "@aeo-pcs/shared";

export const DEFAULT_COUNTRY_CODE = "IN";
export const DEFAULT_COUNTRY_NAME = "India";

export function emptyGeoLocation(): GeoLocation {
  return {
    city: "",
    state: "",
    country: DEFAULT_COUNTRY_NAME,
    countryCode: DEFAULT_COUNTRY_CODE,
    stateCode: "",
  };
}

export function defaultGeoLocation(): GeoLocation {
  return emptyGeoLocation();
}

export function geoLocationFromValue(
  value?: Partial<GeoLocation> | null,
  defaultCountryCode = DEFAULT_COUNTRY_CODE,
): GeoLocation {
  const countryCode = value?.countryCode?.trim() || defaultCountryCode;
  return {
    city: value?.city?.trim() || "",
    state: value?.state?.trim() || "",
    country: value?.country?.trim() || (countryCode === DEFAULT_COUNTRY_CODE ? DEFAULT_COUNTRY_NAME : ""),
    countryCode,
    stateCode: value?.stateCode?.trim() || "",
  };
}

export function geoLocationFromSelection(
  country: { code: string; name: string },
  state?: { code: string; name: string },
  city?: { name: string },
): GeoLocation {
  return {
    city: city?.name || "",
    state: state?.name || "",
    country: country.name,
    countryCode: country.code,
    stateCode: state?.code || "",
  };
}

export function isGeoLocationComplete(loc: GeoLocation): boolean {
  return Boolean(loc.city?.trim() && loc.country?.trim());
}
