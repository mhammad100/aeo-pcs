"use client";

import { AutoComplete, Input } from "antd";
import { SOCIAL_PLATFORMS, socialPlatformIcon } from "@/lib/socialPlatforms";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  usedLabels?: string[];
};

export default function SocialPlatformSelect({
  value,
  onChange,
  disabled,
  usedLabels = [],
}: Props) {
  const options = SOCIAL_PLATFORMS.filter(
    (platform) =>
      !usedLabels.includes(platform.label) || platform.label === value?.trim(),
  ).map((platform) => ({
    value: platform.label,
    label: (
      <span className="social-platform-option">
        <span className="social-platform-option-icon">{platform.icon}</span>
        {platform.label}
      </span>
    ),
  }));

  return (
    <AutoComplete
      className="social-platform-select"
      value={value}
      disabled={disabled}
      options={options}
      placeholder="Select or type platform"
      onChange={onChange}
      filterOption={(input, option) =>
        String(option?.value ?? "")
          .toLowerCase()
          .includes(input.toLowerCase())
      }
      classNames={{ popup: { root: "social-platform-dropdown" } }}
    >
      <Input
        prefix={<span className="social-platform-input-icon">{socialPlatformIcon(value || "")}</span>}
        placeholder="Select or type platform"
      />
    </AutoComplete>
  );
}
