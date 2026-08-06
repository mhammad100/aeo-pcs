"use client";

import { Steps } from "antd";

export default function OnboardingSteps({ current }: { current: 0 | 1 }) {
  return (
    <Steps
      className="onboarding-steps"
      current={current}
      size="small"
      items={[{ title: "Choose plan" }, { title: "Business profile" }]}
    />
  );
}
