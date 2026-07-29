"use client";

import { Steps } from "antd";

export default function OnboardingSteps({ current }: { current: 0 | 1 }) {
  return (
    <Steps
      current={current}
      size="small"
      style={{ marginBottom: 24, maxWidth: 420 }}
      items={[{ title: "Choose plan" }, { title: "Business profile" }]}
    />
  );
}
