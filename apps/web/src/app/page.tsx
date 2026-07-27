import Link from "next/link";
import PublicFooter from "@/components/marketing/PublicFooter";
import PublicHeader from "@/components/marketing/PublicHeader";

export default function HomePage() {
  return (
    <div className="ma-hero">
      <div className="ma-hero-bg" aria-hidden />
      <div className="ma-hero-grid" aria-hidden />
      <div className="ma-hero-orb" aria-hidden />
      <PublicHeader />
      <div className="ma-hero-content">
        <h1 className="ma-brand ma-rise">masteraeo</h1>
        <p className="ma-headline ma-rise ma-rise-delay-1">
          See how AI talks about your business.
        </p>
        <p className="ma-lede ma-rise ma-rise-delay-2">
          Track mentions across AI assistants, get a fix-it plan, and improve visibility month over
          month.
        </p>
        <div className="ma-cta-row ma-rise ma-rise-delay-3">
          <Link href="/signup" className="ma-btn ma-btn-primary">
            Get started
          </Link>
          <Link href="/features" className="ma-btn ma-btn-ghost">
            Explore product
          </Link>
        </div>
      </div>

      <section className="ma-section" id="product">
        <div className="ma-section-label">Why masteraeo</div>
        <h2 className="ma-section-title">Built for businesses that need to show up in AI answers</h2>
        <p className="ma-section-copy">
          Search is changing. Customers ask ChatGPT-style tools where to go and what to buy. If you
          are invisible there, you lose demand you never see in Google Analytics.
        </p>
        <div className="ma-feature-list">
          <article className="ma-feature">
            <h3>Visibility score</h3>
            <p>
              Run buyer-intent prompts and measure how often your brand is named across simulated
              assistant styles.
            </p>
          </article>
          <article className="ma-feature">
            <h3>Actionable plan</h3>
            <p>
              Get ready-made content plus a human checklist — claim listings, earn citations, close
              the gaps AI models already trust.
            </p>
          </article>
          <article className="ma-feature">
            <h3>Progress over time</h3>
            <p>
              Compare this month to last, track checklist completion, and keep your profile ready for
              every new run.
            </p>
          </article>
        </div>
      </section>

      <section className="ma-section" style={{ paddingTop: 24 }}>
        <div className="ma-section-label">How it works</div>
        <h2 className="ma-section-title">From profile to plan in one workspace</h2>
        <p className="ma-section-copy">
          Sign in, complete your business profile once, then run checks whenever you need a fresh
          read on AI visibility.
        </p>
        <div className="ma-steps">
          <div className="ma-step">
            <h3>Connect your business</h3>
            <p>Website, location, and optional Google Business or social links — one source of truth.</p>
          </div>
          <div className="ma-step">
            <h3>Run visibility checks</h3>
            <p>We probe realistic buyer questions and score whether AI assistants mention you.</p>
          </div>
          <div className="ma-step">
            <h3>Act and track</h3>
            <p>Generate content, tick off offline actions, and watch your score trend upward.</p>
          </div>
        </div>
      </section>

      <section className="ma-band">
        <div className="ma-band-inner">
          <div>
            <h2>Ready to see your AI footprint?</h2>
            <p>Invite-only for now. Log in if you have access, or request an account to join.</p>
          </div>
          <div className="ma-cta-row">
            <Link href="/login" className="ma-btn ma-btn-primary">
              Log in to dashboard
            </Link>
            <Link href="/pricing" className="ma-btn ma-btn-ghost">
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
