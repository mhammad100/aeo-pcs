export type GeoLocation = {
  city: string;
  state: string;
  country: string;
  countryCode?: string;
  stateCode?: string;
};

export type GeoCountryOption = { code: string; name: string };
export type GeoStateOption = { code: string; name: string };
export type GeoCityOption = { name: string };

export function normalizeGeoLocation(
  value: Partial<GeoLocation> | string | null | undefined,
  fallback?: Partial<GeoLocation>,
): GeoLocation | null {
  if (!value) return null;

  if (typeof value === "string") {
    const city = value.trim();
    if (!city) return null;
    return {
      city,
      state: fallback?.state?.trim() || "",
      country: fallback?.country?.trim() || "",
      countryCode: fallback?.countryCode?.trim() || undefined,
      stateCode: fallback?.stateCode?.trim() || undefined,
    };
  }

  // Target markets may be country-only, country+state, or country+state+city.
  // Do not fill state/city from HQ fallback — empty means intentionally broader.
  const country = String(value.country || fallback?.country || "").trim();
  if (!country) return null;

  const city = String(value.city || "").trim();
  const state = String(value.state || "").trim();
  const countryCode = String(value.countryCode || fallback?.countryCode || "").trim();
  const stateCode = String(value.stateCode || "").trim();

  return {
    city,
    state,
    country,
    countryCode: countryCode || undefined,
    stateCode: stateCode || undefined,
  };
}

export function normalizeGeoLocationList(
  values: unknown,
  fallback?: Partial<GeoLocation>,
  max = 15,
): GeoLocation[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: GeoLocation[] = [];

  for (const item of values) {
    const loc = normalizeGeoLocation(item as Partial<GeoLocation> | string, fallback);
    if (!loc) continue;
    const key = formatGeoLocation(loc).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(loc);
    if (out.length >= max) break;
  }

  return out;
}

export function formatGeoLocation(loc: GeoLocation): string {
  return [loc.city, loc.state, loc.country].filter((part) => part?.trim()).join(", ");
}

export function locationsShareCountry(a: GeoLocation, b: GeoLocation): boolean {
  const countryA = a.country.trim().toLowerCase();
  const countryB = b.country.trim().toLowerCase();
  if (countryA && countryB) return countryA === countryB;
  const codeA = a.countryCode?.trim().toLowerCase();
  const codeB = b.countryCode?.trim().toLowerCase();
  return Boolean(codeA && codeB && codeA === codeB);
}

export function headquartersLocation(input: {
  city: string;
  state?: string;
  country: string;
  countryCode?: string;
  stateCode?: string;
}): GeoLocation {
  return {
    city: input.city.trim(),
    state: input.state?.trim() || "",
    country: input.country.trim(),
    countryCode: input.countryCode?.trim() || undefined,
    stateCode: input.stateCode?.trim() || undefined,
  };
}

/** Locations to use in buyer-intent prompts (target markets, not necessarily HQ). */
export function resolvePromptLocations(
  headquarters: GeoLocation,
  targetLocations?: GeoLocation[],
): string[] {
  const targets = normalizeGeoLocationList(targetLocations);
  if (targets.length > 0) {
    return targets.map(formatGeoLocation);
  }
  const hq = formatGeoLocation(headquarters);
  return hq ? [hq] : [];
}

export function geoLocationSearchTerms(locations: GeoLocation[]): string[] {
  const terms: string[] = [];
  for (const loc of locations) {
    if (loc.city.trim()) terms.push(loc.city.trim().toLowerCase());
    if (loc.state.trim()) terms.push(loc.state.trim().toLowerCase());
    const formatted = formatGeoLocation(loc).toLowerCase();
    if (formatted) terms.push(formatted);
  }
  return terms;
}
