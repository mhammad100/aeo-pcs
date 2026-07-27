import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple plans for AI visibility measurement and action planning with masteraeo.",
};

const tiers = [
  {
    name: "Starter",
    amount: "Invite",
    blurb: "For single-location businesses getting their first AI visibility baseline.",
    points: ["Business profile & onboarding", "Visibility checks", "Action plan & report"],
  },
  {
    name: "Growth",
    amount: "Soon",
    blurb: "For teams that need recurring runs, history, and checklist tracking.",
    points: ["Month-over-month insights", "Action checklist", "Priority support"],
  },
  {
    name: "Agency",
    amount: "Custom",
    blurb: "For operators managing multiple brands under one roof.",
    points: ["Multi-business workflows", "Usage visibility", "Onboarding help"],
  },
];

export default function PricingPage() {
  return (
    <PublicShell>
      <div className="ma-page" style={{ maxWidth: 1120 }}>
        <div className="ma-section-label">Pricing</div>
        <h1 className="ma-section-title">Start with access. Scale when plans unlock.</h1>
        <p className="ma-section-copy">
          Self-serve signup is invite-only while we onboard early businesses. Final plan pricing will
          publish here as subscriptions go live.
        </p>
        <div className="ma-price-grid">
          {tiers.map((t) => (
            <div key={t.name} className="ma-price">
              <h3>{t.name}</h3>
              <p className="amount">{t.amount}</p>
              <p style={{ color: "var(--ma-muted)", marginTop: 0, marginBottom: 16 }}>{t.blurb}</p>
              <ul>
                {t.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="ma-cta-row" style={{ marginTop: 40 }}>
          <Link href="/signup" className="ma-btn ma-btn-primary">
            Request an invite
          </Link>
          <Link href="/login" className="ma-btn ma-btn-ghost">
            Already have access? Log in
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
