"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ProductPlan } from "@aeo-pcs/shared";

export default function CatalogPricingGrid() {
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

  if (loading) {
    return <p style={{ color: "var(--ma-muted)" }}>Loading plans…</p>;
  }

  if (plans.length === 0) {
    return <p style={{ color: "var(--ma-muted)" }}>No plans available yet.</p>;
  }

  return (
    <div className="ma-price-grid">
      {plans.map((t) => (
        <div key={t.id} className="ma-price">
          <h3>{t.name}</h3>
          <p className="amount">{t.priceLabel || `${t.currency} ${t.price}`}</p>
          <p style={{ color: "var(--ma-muted)", marginTop: 0, marginBottom: 16 }}>{t.blurb}</p>
          <ul>
            {t.features.map((p) => (
              <li key={p}>{p}</li>
            ))}
            <li>{t.limits.visibilityRunsPerMonth} visibility checks / month</li>
          </ul>
        </div>
      ))}
    </div>
  );
}
