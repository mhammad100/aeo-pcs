"use client";

import BrandMark from "@/components/BrandMark";

type Props = {
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
};

export default function OnboardingShell({ title, subtitle, wide, children }: Props) {
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
        </header>
        {children}
      </div>
    </div>
  );
}
