"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PublicShell from "@/components/marketing/PublicShell";
import { api } from "@/lib/api";
import type { ProductPlan } from "@aeo-pcs/shared";

export default function PricingPage() {
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.listCatalogPlans();
        if (!cancelled) setPlans(res.plans);
      } catch {
        if (!cancelled) setPlans([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicShell>
      <div className="ma-page" style={{ maxWidth: 1120 }}>
        <div className="ma-section-label">Pricing</div>
        <h1 className="ma-section-title">Start with access. Scale when plans unlock.</h1>
        <p className="ma-section-copy">
          Self-serve signup is invite-only while we onboard early businesses. Plan prices below come
          from the live catalog.
        </p>
        <div className="ma-price-grid">
          {loading && <p style={{ color: "var(--ma-muted)" }}>Loading plans…</p>}
          {!loading && plans.length === 0 && (
            <p style={{ color: "var(--ma-muted)" }}>Plans will appear here shortly.</p>
          )}
          {plans.map((t) => (
            <div key={t.id} className="ma-price">
              <h3>{t.name}</h3>
              <p className="amount">{t.priceLabel || `${t.currency} ${t.price}`}</p>
              <p style={{ color: "var(--ma-muted)", marginTop: 0, marginBottom: 16 }}>{t.blurb}</p>
              <ul>
                {t.features.map((p) => (
                  <li key={p}>{p}</li>
                ))}
                <li>{t.limits.visibilityRunsPerMonth} visibility runs / month</li>
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
