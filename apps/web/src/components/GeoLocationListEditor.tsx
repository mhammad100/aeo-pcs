"use client";

import { Button } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import GeoLocationPicker from "@/components/GeoLocationPicker";
import type { GeoLocation } from "@aeo-pcs/shared";
import { formatGeoLocation } from "@aeo-pcs/shared";
import { emptyGeoLocation, isGeoLocationComplete } from "@/lib/geo";

type Props = {
  value?: GeoLocation[];
  onChange?: (value: GeoLocation[]) => void;
  headquarters?: GeoLocation;
};

export default function GeoLocationListEditor({ value = [], onChange, headquarters }: Props) {
  function updateAt(index: number, loc: GeoLocation) {
    const next = [...value];
    next[index] = loc;
    onChange?.(next);
  }

  function removeAt(index: number) {
    onChange?.(value.filter((_, i) => i !== index));
  }

  function addLocation() {
    const blank = headquarters ? { ...headquarters } : emptyGeoLocation();
    onChange?.([...value, blank]);
  }

  return (
    <div className="geo-location-list">
      {value.length === 0 ? (
        <div className="geo-location-empty">
          <p>
            Optional add areas where you want AI visibility. Country is enough; state and city
            are optional so you can target a whole country, a state, or a city.
          </p>
        </div>
      ) : null}

      {value.map((loc, index) => {
        const complete = isGeoLocationComplete(loc);
        const summary = complete ? formatGeoLocation(loc) : "";

        return (
          <div
            key={`${loc.countryCode || loc.country}-${loc.stateCode || loc.state}-${index}`}
            className="geo-location-card"
          >
            <div className="geo-location-card-head">
              <div className="geo-location-card-title">
                <span className="geo-location-card-badge">Area {index + 1}</span>
                {summary ? <span className="geo-location-card-summary">{summary}</span> : null}
              </div>
              <Button
                type="text"
                className="geo-location-card-remove"
                aria-label="Remove location"
                icon={<DeleteOutlined />}
                onClick={() => removeAt(index)}
              />
            </div>
            <GeoLocationPicker
              value={loc}
              showSummary={false}
              depthOptional
              onChange={(next) => updateAt(index, next)}
            />
          </div>
        );
      })}

      <Button
        type="dashed"
        className="geo-location-add"
        onClick={addLocation}
        icon={<PlusOutlined />}
        block
      >
        Add target location
      </Button>
    </div>
  );
}
