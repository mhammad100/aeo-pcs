import Link from "next/link";
import PublicFooter from "@/components/marketing/PublicFooter";
import PublicHeader from "@/components/marketing/PublicHeader";
import CatalogPricingGrid from "@/components/marketing/CatalogPricingGrid";

export default function HomePage() {
  return (
    <div className="ma-hero">
      <div className="ma-hero-viewport">
        <div className="ma-hero-bg" aria-hidden />
        <div className="ma-hero-orb" aria-hidden />
        <div className="ma-hero-glow" aria-hidden />
        <PublicHeader />

        <div className="ma-hero-content">
          <div className="ma-hero-copy">
            <p className="ma-hero-eyebrow ma-rise">Answer engine optimization</p>
            <h1 className="ma-brand ma-rise">
              Master <span>AEO</span>
            </h1>
            <p className="ma-headline ma-rise ma-rise-delay-1">
              Is your business
              <br />
              visible to AI?
            </p>
            <p className="ma-lede ma-rise ma-rise-delay-2">
              When buyers ask ChatGPT, Gemini, or Perplexity for the best in your category — do they
              find you?
            </p>
            <div className="ma-cta-row ma-rise ma-rise-delay-3">
              <Link href="/signup" className="ma-btn ma-btn-primary">
                Check your score
              </Link>
              <Link href="/#features" className="ma-btn ma-btn-ghost">
                See how it works
              </Link>
            </div>
            <ul className="ma-hero-proof ma-rise ma-rise-delay-3">
              <li>7 intent clusters</li>
              <li>3 AI models checked</li>
              <li>Fix-it ready-made content</li>
            </ul>
          </div>

          <div className="ma-hero-stage" aria-hidden>
            <div className="ma-hero-stage-inner">
              <div className="ma-hero-stage-top">
                <div className="ma-hero-stage-bar">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="ma-hero-stage-live">Live</span>
              </div>
              <div className="ma-hero-stage-label">AI visibility report</div>
              <div className="ma-hero-stage-score">42%</div>
              <p className="ma-hero-stage-meta">
                Sample visibility score — how often assistants named this business across checked
                prompts.
              </p>
              <div className="ma-hero-stage-rows">
                <div className="ma-hero-stage-row">
                  <strong>ChatGPT</strong>
                  <em>mentioned</em>
                </div>
                <div className="ma-hero-stage-row">
                  <strong>Gemini</strong>
                  <span>not mentioned</span>
                </div>
                <div className="ma-hero-stage-row">
                  <strong>Perplexity</strong>
                  <em>mentioned</em>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="ma-section-wide">
        <div className="ma-section">
          <div className="ma-split">
            <div>
              <div className="ma-section-label">The shift</div>
              <h2 className="ma-section-title ma-section-title-wide">
                Customers ask AI where to go. Are you in the answer?
              </h2>
            </div>
            <div>
              <p className="ma-section-copy" style={{ marginBottom: 18 }}>
                People no longer only search blue links. They ask assistants for restaurants,
                clinics, coaches, builders, and local services — and trust the names that show up.
              </p>
              <p className="ma-section-copy" style={{ marginBottom: 0 }}>
                If competitors own those answers, you lose demand that never appears in classic SEO
                reports. Master AEO makes that gap visible, then helps you close it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="ma-section" id="features">
        <div className="ma-section-label">Features</div>
        <h2 className="ma-section-title ma-section-title-wide">
          Everything you need to earn a place in AI answers
        </h2>
        <p className="ma-section-copy">
          Measurement and remediation in one product — score the gap, then close it with content and
          real-world actions.
        </p>
        <div className="ma-feature-list">
          <article className="ma-feature ma-feature-accent">
            <h3>Prompt-based checks</h3>
            <p>
              Generate buyer-intent questions for your category and city, edit them, then run them
              across assistant-style responses.
            </p>
          </article>
          <article className="ma-feature ma-feature-accent">
            <h3>Mention scoring</h3>
            <p>
              See how often your brand is named — plus the sources models lean on instead of you.
            </p>
          </article>
          <article className="ma-feature ma-feature-accent">
            <h3>Fix-it workspace</h3>
            <p>
              Ready-made content you can publish, plus a human checklist for listings, reviews, and
              citations.
            </p>
          </article>
          <article className="ma-feature ma-feature-accent">
            <h3>Business profile</h3>
            <p>
              Website, Google Business, and social links stored once — every check uses the same
              identity.
            </p>
          </article>
          <article className="ma-feature ma-feature-accent">
            <h3>Dashboard insights</h3>
            <p>
              Track current vs previous month visibility and checklist progress as your program
              matures.
            </p>
          </article>
          <article className="ma-feature ma-feature-accent">
            <h3>Shareable reports</h3>
            <p>
              Download HTML reports with score, prompt findings, and plan status for stakeholders.
            </p>
          </article>
        </div>
        <div className="ma-cta-row" style={{ marginTop: 36 }}>
          <Link href="/features" className="ma-btn ma-btn-ghost">
            View full features
          </Link>
        </div>
      </section>

      <section className="ma-section" style={{ paddingTop: 8 }}>
        <div className="ma-section-label">Who it is for</div>
        <h2 className="ma-section-title">Built for operators who need local demand</h2>
        <p className="ma-section-copy">
          Especially useful when your growth depends on being recommended in a city or category — not
          just ranking a blog post.
        </p>
        <div className="ma-audience">
          <div className="ma-audience-row">
            <h3>Local services</h3>
            <p>
              Clinics, salons, restaurants, coaches, and hospitality brands that win or lose by
              neighborhood reputation.
            </p>
          </div>
          <div className="ma-audience-row">
            <h3>Retail & specialty</h3>
            <p>
              Stores and makers who need AI assistants to name them alongside trusted directories and
              marketplaces.
            </p>
          </div>
          <div className="ma-audience-row">
            <h3>Agencies & consultants</h3>
            <p>
              Teams who want a clear baseline and shareable report before pitching GEO or AI-visibility
              work.
            </p>
          </div>
        </div>
      </section>

      <section className="ma-section" style={{ paddingTop: 48 }}>
        <div className="ma-section-label">How it works</div>
        <h2 className="ma-section-title">From profile to plan in one workspace</h2>
        <p className="ma-section-copy">
          Sign in, complete your business profile once, then run checks whenever you need a fresh
          read on AI visibility.
        </p>
        <div className="ma-steps">
          <div className="ma-step">
            <h3>Connect your business</h3>
            <p>
              Website, location, and optional Google Business or social links — one identity for every
              check.
            </p>
          </div>
          <div className="ma-step">
            <h3>Run visibility checks</h3>
            <p>
              We probe realistic buyer questions and score whether assistant-style answers mention
              you.
            </p>
          </div>
          <div className="ma-step">
            <h3>Act and track</h3>
            <p>
              Generate content, tick off offline actions, and compare this month to the last.
            </p>
          </div>
        </div>
      </section>

      <section className="ma-section-wide">
        <div className="ma-section">
          <div className="ma-section-label">Inside the dashboard</div>
          <h2 className="ma-section-title ma-section-title-wide">
            What you work with after you log in
          </h2>
          <p className="ma-section-copy">
            The public site explains the product. Your dashboard is where the work happens — profile,
            checks, plans, and progress.
          </p>
          <div className="ma-deliverables">
            <div className="ma-deliverable">
              <h3>Business profile</h3>
              <p>
                Keep website, Google Business, and social links current so every run uses the same
                facts.
              </p>
            </div>
            <div className="ma-deliverable">
              <h3>Visibility runs</h3>
              <p>
                Prompt sets, per-model findings, mention scoring, and downloadable reports for
                stakeholders.
              </p>
            </div>
            <div className="ma-deliverable">
              <h3>Action plan</h3>
              <p>
                Generated copy blocks plus a checklist for the real-world steps that improve citations.
              </p>
            </div>
            <div className="ma-deliverable">
              <h3>Trends over time</h3>
              <p>
                Month-over-month visibility and checklist progress so you can prove the program is
                moving.
              </p>
            </div>
          </div>
          <blockquote className="ma-quote">
            <p>
              “If AI is the new storefront window, Master AEO shows whether your name is on the glass —
              and what to do if it is not.”
            </p>
            <cite>Product principle · Master AEO</cite>
          </blockquote>
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

      <section className="ma-section-wide" id="about">
        <div className="ma-section">
          <div className="ma-split">
            <div>
              <div className="ma-section-label">About</div>
              <h2 className="ma-section-title ma-section-title-wide">
                We help businesses earn a seat in AI answers
              </h2>
            </div>
            <div>
              <p className="ma-section-copy" style={{ marginBottom: 18, maxWidth: "52ch" }}>
                Master AEO builds practical AI visibility tools for local and growing companies —
                measure whether assistants recommend you, understand who gets cited instead, and leave
                with a concrete plan.
              </p>
              <p className="ma-section-copy" style={{ marginBottom: 24, maxWidth: "52ch" }}>
                Visibility checks, action plans, and a business dashboard so teams improve over months
                — not just a one-off audit.
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
        </div>
      </section>

      <section className="ma-section">
        <div className="ma-section-label">Common questions</div>
        <h2 className="ma-section-title">Straight answers</h2>
        <div className="ma-faq">
          <details>
            <summary>Is this the same as SEO?</summary>
            <p>
              Related, but not the same. Classic SEO optimizes for search results pages. Master AEO
              focuses on whether AI assistants name your business when people ask for
              recommendations — and which sources those models cite.
            </p>
          </details>
          <details>
            <summary>Do I need a finished website?</summary>
            <p>
              No. A website URL is optional but recommended — it helps AI assistants verify your
              business. You can still improve listings and reviews in parallel; the product helps
              prioritize both.
            </p>
          </details>
          <details>
            <summary>How do I get started?</summary>
            <p>
              Create an account, choose a plan, complete your business profile, then run visibility
              checks from your dashboard.
            </p>
          </details>
          <details>
            <summary>What happens after I sign up?</summary>
            <p>
              You choose a plan, complete your business profile, then enter the dashboard to run
              visibility checks, review findings, and work the action plan.
            </p>
          </details>
        </div>
      </section>

      <section className="ma-band">
        <div className="ma-band-glow" aria-hidden />
        <div className="ma-band-inner">
          <div className="ma-band-copy">
            <p className="ma-band-eyebrow">Get started</p>
            <h2>Ready to see your AI footprint?</h2>
            <p>
              Check whether assistants recommend your business — then close the gap with a clear
              action plan.
            </p>
          </div>
          <div className="ma-cta-row ma-band-actions">
            <Link href="/signup" className="ma-btn ma-btn-primary">
              Check your score
            </Link>
            <Link href="/login" className="ma-btn ma-btn-ghost">
              Log in
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
