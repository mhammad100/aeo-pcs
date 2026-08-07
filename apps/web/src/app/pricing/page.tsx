"use client";

import Link from "next/link";
import PublicShell from "@/components/marketing/PublicShell";
import CatalogPricingGrid from "@/components/marketing/CatalogPricingGrid";

export default function PricingPage() {
  return (
    <PublicShell>
      <div className="ma-page-narrow" style={{ maxWidth: 1120 }}>
        <div className="ma-section-label">Pricing</div>
        <h1 className="ma-section-title">Pricing</h1>
        <CatalogPricingGrid />
        <div className="ma-cta-row" style={{ marginTop: 40 }}>
          <Link href="/signup" className="ma-btn ma-btn-primary">
            Get started
          </Link>
          <Link href="/login" className="ma-btn ma-btn-ghost">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
