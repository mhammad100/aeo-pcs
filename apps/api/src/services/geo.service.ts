import { City, Country, State } from "country-state-city";

export type GeoCountryOption = { code: string; name: string };
export type GeoStateOption = { code: string; name: string };
export type GeoCityOption = { name: string };

export function listCountries(): GeoCountryOption[] {
  return Country.getAllCountries()
    .map((country) => ({ code: country.isoCode, name: country.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listStates(countryCode: string): GeoStateOption[] {
  const code = countryCode.trim().toUpperCase();
  if (!code) return [];
  return State.getStatesOfCountry(code)
    .map((state) => ({ code: state.isoCode, name: state.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listCities(countryCode: string, stateCode?: string): GeoCityOption[] {
  const country = countryCode.trim().toUpperCase();
  if (!country) return [];

  const state = stateCode?.trim().toUpperCase();
  const cities = state
    ? City.getCitiesOfState(country, state) || []
    : City.getCitiesOfCountry(country) || [];

  return cities
    .map((city) => ({ name: city.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
