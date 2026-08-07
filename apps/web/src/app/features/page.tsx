import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Features",
  description: "AI visibility scoring, action plans, and month-over-month insights from Master AEO.",
};

export default function FeaturesPage() {
  return (
    <PublicShell>
      <div className="ma-page-narrow">
        <div className="ma-section-label">Product</div>
        <h1 className="ma-section-title" style={{ maxWidth: "22ch" }}>
          Everything you need to earn a place in AI answers
        </h1>
        <p className="ma-section-copy">
          Master AEO combines measurement and remediation so local and growing businesses can compete
          where customers increasingly ask for recommendations.
        </p>

        <div className="ma-feature-list" style={{ marginTop: 8 }}>
          <article className="ma-feature">
            <h3>Prompt-based checks</h3>
            <p>
              Generate buyer-intent questions for your category and city, edit them, then run them
              across assistant-style responses grounded in live web context.
            </p>
          </article>
          <article className="ma-feature">
            <h3>Mention scoring</h3>
            <p>
              See a clear visibility percentage, how often your brand is named plus the sources
              models lean on instead of you.
            </p>
          </article>
          <article className="ma-feature">
            <h3>Fix-it workspace</h3>
            <p>
              Automatable content you can publish, plus a checklist for listings, reviews, and
              citations that require a human.
            </p>
          </article>
          <article className="ma-feature">
            <h3>Business profile</h3>
            <p>
              Website, Google Business, and social links stored once, every check uses the same
              identity.
            </p>
          </article>
          <article className="ma-feature">
            <h3>Dashboard insights</h3>
            <p>
              Track current vs previous month visibility and checklist progress as your program
              matures.
            </p>
          </article>
          <article className="ma-feature">
            <h3>Reports</h3>
            <p>
              Download a shareable HTML report for stakeholders, score, prompt findings, and plan
              status in one place.
            </p>
          </article>
        </div>

        <div className="ma-cta-row" style={{ marginTop: 48 }}>
          <Link href="/signup" className="ma-btn ma-btn-primary">
            Get started
          </Link>
          <Link href="/pricing" className="ma-btn ma-btn-ghost">
            See pricing
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
