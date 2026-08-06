"use client";

import { Select } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import type { GeoLocation } from "@aeo-pcs/shared";
import { formatGeoLocation } from "@aeo-pcs/shared";
import { api } from "@/lib/api";
import { emptyGeoLocation, geoLocationFromSelection, isGeoLocationComplete } from "@/lib/geo";

type Props = {
  value?: GeoLocation;
  onChange?: (value: GeoLocation) => void;
  disabled?: boolean;
  showLabels?: boolean;
  showSummary?: boolean;
  /** When true (target markets), state and city may be left empty. HQ should leave this false. */
  depthOptional?: boolean;
  className?: string;
};

export default function GeoLocationPicker({
  value,
  onChange,
  disabled,
  showLabels = true,
  showSummary = true,
  depthOptional = false,
  className,
}: Props) {
  const current = value || emptyGeoLocation();
  const countryCode = current.countryCode || "";
  const stateCode = current.stateCode || "";

  const [countries, setCountries] = useState<Array<{ code: string; name: string }>>([]);
  const [states, setStates] = useState<Array<{ code: string; name: string }>>([]);
  const [cities, setCities] = useState<Array<{ name: string }>>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingCountries(true);
    api
      .getGeoCountries()
      .then((res) => {
        if (!cancelled) setCountries(res.countries);
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCountries(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!countryCode) {
      setStates([]);
      return;
    }

    let cancelled = false;
    setLoadingStates(true);
    api
      .getGeoStates(countryCode)
      .then((res) => {
        if (!cancelled) setStates(res.states);
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  useEffect(() => {
    if (!countryCode) {
      setCities([]);
      return;
    }

    const awaitingState = states.length > 0 && !stateCode;
    if (awaitingState) {
      setCities([]);
      return;
    }

    let cancelled = false;
    setLoadingCities(true);
    api
      .getGeoCities(countryCode, states.length > 0 ? stateCode : undefined)
      .then((res) => {
        if (!cancelled) setCities(res.cities);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countryCode, stateCode, states.length]);

  const hasStates = states.length > 0;
  const showStateField = Boolean(countryCode && (loadingStates || hasStates));
  const cityDisabled = disabled || !countryCode || (hasStates && !stateCode);
  const selectedCountry = countries.find((c) => c.code === countryCode);

  const cityPlaceholder = hasStates && !stateCode
    ? depthOptional
      ? "Select state first (optional)"
      : "Select state first"
    : depthOptional
      ? "Select city (optional)"
      : "Select city";
  const summary = useMemo(() => {
    if (depthOptional ? isGeoLocationComplete(current) : Boolean(current.city?.trim() && current.country?.trim())) {
      return formatGeoLocation(current);
    }
    const parts = [current.city, current.state, current.country].filter((p) => p?.trim());
    return parts.length ? parts.join(", ") : "";
  }, [current, depthOptional]);

  const rootClass = ["geo-location-picker", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <div className="geo-location-grid">
        <div className="geo-location-field">
          {showLabels ? <span className="geo-location-field-label">Country</span> : null}
          <Select
            showSearch
            size="large"
            className="geo-location-select"
            placeholder="Select country"
            disabled={disabled}
            loading={loadingCountries}
            value={countryCode || undefined}
            optionFilterProp="label"
            options={countries.map((c) => ({ value: c.code, label: c.name }))}
            onChange={(code) => {
              const country = countries.find((c) => c.code === code);
              if (country) onChange?.(geoLocationFromSelection(country));
            }}
          />
        </div>

        {showStateField ? (
          <div className="geo-location-field">
            {showLabels ? (
              <span className="geo-location-field-label">
                {depthOptional ? "State / region (optional)" : "State / region"}
              </span>
            ) : null}
            <Select
              showSearch
              allowClear={depthOptional}
              size="large"
              className="geo-location-select"
              placeholder={
                loadingStates
                  ? "Loading states…"
                  : depthOptional
                    ? "Select state (optional)"
                    : "Select state"
              }
              disabled={disabled || !countryCode}
              loading={loadingStates}
              value={stateCode || undefined}
              optionFilterProp="label"
              options={states.map((s) => ({ value: s.code, label: s.name }))}
              onChange={(code) => {
                if (!selectedCountry) return;
                if (!code) {
                  onChange?.(geoLocationFromSelection(selectedCountry));
                  return;
                }
                const state = states.find((s) => s.code === code);
                if (state) onChange?.(geoLocationFromSelection(selectedCountry, state));
              }}
            />
          </div>
        ) : null}

        <div className="geo-location-field">
          {showLabels ? (
            <span className="geo-location-field-label">
              {depthOptional ? "City (optional)" : "City"}
            </span>
          ) : null}
          <Select
            showSearch
            allowClear={depthOptional}
            size="large"
            className="geo-location-select"
            placeholder={cityPlaceholder}
            disabled={cityDisabled}
            loading={loadingCities}
            value={current.city || undefined}
            optionFilterProp="label"
            options={cities.map((c) => ({ value: c.name, label: c.name }))}
            onChange={(cityName) => {
              if (!selectedCountry) return;
              const state = hasStates ? states.find((s) => s.code === stateCode) : undefined;
              if (!cityName) {
                onChange?.(geoLocationFromSelection(selectedCountry, state));
                return;
              }
              const city = cities.find((c) => c.name === cityName);
              onChange?.(
                geoLocationFromSelection(selectedCountry, state, city || { name: cityName }),
              );
            }}
          />
        </div>
      </div>

      {showSummary && summary ? (
        <p className="geo-location-summary">
          <EnvironmentOutlined />
          <span>{summary}</span>
        </p>
      ) : null}
    </div>
  );
}
