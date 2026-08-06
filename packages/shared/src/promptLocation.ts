import type { GeoLocation } from "./geo";
import { formatGeoLocation } from "./geo";

export type PromptLocationStyle = "near_me" | "explicit" | "implicit";

const NEAR_ME_PATTERN = /\bnear\s*me\b|\bnearby\b/i;

export function inferPromptLocationStyle(
  prompt: string,
  locations: GeoLocation[] = [],
): PromptLocationStyle {
  if (NEAR_ME_PATTERN.test(prompt)) return "near_me";
  if (hasExplicitGeoInPrompt(prompt, locations)) return "explicit";
  return "implicit";
}

export function promptMentionsLocation(prompt: string, loc: GeoLocation): boolean {
  const p = prompt.toLowerCase();
  const city = loc.city.trim().toLowerCase();
  if (city.length >= 3 && p.includes(city)) return true;
  const state = loc.state.trim().toLowerCase();
  if (state.length >= 3 && p.includes(state)) return true;
  const formatted = formatGeoLocation(loc).toLowerCase();
  if (formatted.length >= 5 && p.includes(formatted)) return true;
  return false;
}

export function hasExplicitGeoInPrompt(prompt: string, locations: GeoLocation[]): boolean {
  return locations.some((loc) => promptMentionsLocation(prompt, loc));
}

/** Pick one service area to simulate the asking user's location (Peec-style per-chat geo). */
export function pickSimulatedUserLocation(
  prompt: string,
  locations: GeoLocation[],
  headquarters: GeoLocation,
  promptIndex = 0,
): GeoLocation {
  const list = locations.length ? locations : [headquarters];
  for (const loc of list) {
    if (promptMentionsLocation(prompt, loc)) return loc;
  }
  return list[promptIndex % list.length]!;
}

export type VisibilityPromptGeoInput = {
  prompt: string;
  headquarters: GeoLocation;
  targetLocations?: GeoLocation[];
  promptIndex?: number;
};

/**
 * Build location context for a visibility check.
 * Returns null when the prompt already contains explicit geo (avoid double-stacking).
 */
export function buildVisibilityLocationContext(input: VisibilityPromptGeoInput): string | null {
  const targets = input.targetLocations?.length ? input.targetLocations : [input.headquarters];
  const style = inferPromptLocationStyle(input.prompt, targets);
  if (style === "explicit") return null;

  const simulated = pickSimulatedUserLocation(
    input.prompt,
    targets,
    input.headquarters,
    input.promptIndex ?? 0,
  );
  return `User location: ${formatGeoLocation(simulated)}`;
}
