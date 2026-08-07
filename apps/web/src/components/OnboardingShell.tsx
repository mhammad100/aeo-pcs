"use client";

import BrandMark from "@/components/BrandMark";
import OnboardingSteps from "@/components/OnboardingSteps";

type Props = {
  step: 0 | 1;
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
};

export default function OnboardingShell({ step, title, subtitle, wide, children }: Props) {
  return (
    <div className="onboarding-page">
      <div className={`onboarding-shell${wide ? " is-wide" : ""}`}>
        <header className="onboarding-header">
          <span className="onboarding-brand ma-brand-lockup">
            <BrandMark size={32} />
            <span className="ma-brand-lockup-copy">
              <span className="ma-brand-lockup-name">
                Master <em>AEO</em>
              </span>
              <span className="ma-brand-lockup-tag">Answer engine optimization</span>
            </span>
          </span>
          <h1 className="onboarding-title">{title}</h1>
          {subtitle && <p className="onboarding-subtitle">{subtitle}</p>}
          <OnboardingSteps current={step} />
        </header>
        {children}
      </div>
    </div>
  );
}
