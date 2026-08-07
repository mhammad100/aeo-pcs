import Link from "next/link";
import PublicFooter from "@/components/marketing/PublicFooter";
import PublicHeader from "@/components/marketing/PublicHeader";
import LandingHero from "@/components/marketing/LandingHero";
import CatalogPricingGrid from "@/components/marketing/CatalogPricingGrid";

export default function HomePage() {
  return (
    <div className="ma-page">
      <PublicHeader sticky />
      <LandingHero />

      <section className="ma-section" id="how-it-works">
        <div className="ma-section-center">
          <div className="ma-section-label">How it works</div>
          <h2 className="ma-section-title ma-section-title-center">
            From invisible to answer-ready in three steps
          </h2>
        </div>
        <div className="ma-how-grid">
          <article className="ma-how-card">
            <div className="ma-how-num">01</div>
            <h3>Run the scan</h3>
            <p>
              We ask ChatGPT, Gemini, and Perplexity the real questions your buyers ask across 7
              intent clusters.
            </p>
          </article>
          <article className="ma-how-card">
            <div className="ma-how-num">02</div>
            <h3>See the root cause</h3>
            <p>
              Get a scored report showing exactly why you&apos;re missing weak local signal, no
              forum presence, and thin footprint.
            </p>
          </article>
          <article className="ma-how-card">
            <div className="ma-how-num">03</div>
            <h3>Fix it, ready-made</h3>
            <p>
              MasterAEO generates the exact content needed to close the gap, published and
              re-checked automatically.
            </p>
          </article>
        </div>
      </section>

      <section className="ma-models-band" id="features">
        <div className="ma-section-center">
          <div className="ma-section-label ma-section-label-muted">Checked against</div>
          <h2 className="ma-section-title ma-section-title-center">
            Every model your buyers actually use
          </h2>
        </div>
        <div className="ma-models-grid">
          <article className="ma-model-card">
            <h3>ChatGPT</h3>
            <div className="ma-model-bar">
              <span style={{ width: "85%" }} />
            </div>
            <p>85% average visibility uplift</p>
          </article>
          <article className="ma-model-card">
            <h3>Gemini</h3>
            <div className="ma-model-bar">
              <span style={{ width: "90%" }} />
            </div>
            <p>90% average visibility uplift</p>
          </article>
          <article className="ma-model-card">
            <h3>Perplexity</h3>
            <div className="ma-model-bar">
              <span style={{ width: "94%" }} />
            </div>
            <p>94% average visibility uplift</p>
          </article>
        </div>
      </section>

      <section className="ma-section" id="pricing">
        <div className="ma-section-label">Pricing</div>
        <h2 className="ma-section-title">Plans that match how you run visibility</h2>
        <p className="ma-section-copy">
          Sign up, choose a plan, and start measuring how AI assistants talk about your business.
        </p>
        <CatalogPricingGrid />
        <div className="ma-cta-row" style={{ marginTop: 36 }}>
          <Link href="/signup" className="ma-btn ma-btn-primary">
            Get started
          </Link>
          <Link href="/pricing" className="ma-btn ma-btn-ghost">
            Full pricing page
          </Link>
        </div>
      </section>

      <section className="ma-section" id="about">
        <div className="ma-split">
          <div>
            <div className="ma-section-label">About</div>
            <h2 className="ma-section-title ma-section-title-wide">
              We help businesses earn a seat in AI answers
            </h2>
          </div>
          <div>
            <p className="ma-section-copy" style={{ marginBottom: 18, maxWidth: "52ch" }}>
              Master AEO builds practical AI visibility tools for local and growing companies
              measure whether assistants recommend you, understand who gets cited instead, and leave
              with a concrete plan.
            </p>
            <p className="ma-section-copy" style={{ marginBottom: 24, maxWidth: "52ch" }}>
              Visibility checks, action plans, and a business dashboard so teams improve over months
              not just a one-off audit.
            </p>
            <div className="ma-cta-row">
              <Link href="/about" className="ma-btn ma-btn-ghost">
                More about us
              </Link>
              <a href="mailto:hello@masteraeo.com" className="ma-btn ma-btn-primary">
                Contact
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="ma-proof-band">
        <div className="ma-proof-glow" aria-hidden />
        <div className="ma-proof-scores">
          <span className="ma-proof-before ma-flicker">24%</span>
          <span className="ma-proof-arrow" aria-hidden>
            →
          </span>
          <span className="ma-proof-after ma-flicker ma-flicker-delay">89%</span>
        </div>
        <h2 className="ma-proof-title">AI found your competitor. Not you.</h2>
        <p className="ma-proof-copy">Run a free scan and see exactly where you stand.</p>
        <Link href="/signup" className="ma-btn ma-btn-primary">
          Check your score
        </Link>
      </section>

      <PublicFooter />
    </div>
  );
}
