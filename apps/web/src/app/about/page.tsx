import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "About",
  description: "Master AEO helps businesses understand and improve how they appear in AI assistants.",
};

export default function AboutPage() {
  return (
    <PublicShell>
      <div className="ma-page">
        <div className="ma-section-label">Company</div>
        <h1 className="ma-section-title" style={{ maxWidth: "20ch" }}>
          We help businesses earn a seat in AI answers
        </h1>
        <p className="ma-section-copy" style={{ maxWidth: "52ch" }}>
          Master AEO is building practical AI visibility tools for local and growing companies —
          measure whether assistants recommend you, understand who gets cited instead, and leave with
          a concrete plan.
        </p>
        <p className="ma-section-copy" style={{ maxWidth: "52ch" }}>
          Our product combines visibility checks, action plans, and a business dashboard so teams can
          improve over months — not just run a one-off audit.
        </p>
        <div className="ma-cta-row">
          <Link href="/features" className="ma-btn ma-btn-primary">
            See features
          </Link>
          <a href="mailto:hello@masteraeo.com" className="ma-btn ma-btn-ghost">
            Contact us
          </a>
        </div>
      </div>
    </PublicShell>
  );
}
