import type { Metadata } from "next";
import PublicShell from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Refund and cancellation policy for Master AEO subscriptions.",
};

export default function RefundPage() {
  return (
    <PublicShell>
      <div className="ma-page">
        <div className="ma-section-label">Legal</div>
        <h1 className="ma-section-title">Refund Policy</h1>
        <p className="ma-section-copy">Last updated: August 3, 2026</p>

        <div className="ma-legal">
          <h2>Overview</h2>
          <p>
            This Refund Policy applies to paid Master AEO subscriptions and related charges for the
            Service at masteraeo.com.
          </p>
          <p>
            Because Master AEO is a digital SaaS product that delivers immediate access to AI-powered
            visibility tools, refunds are limited as described below.
          </p>

          <h2>General rule</h2>
          <p>
            All sales are generally final. Subscription fees are non-refundable except where required
            by law or expressly approved under this policy.
          </p>

          <h2>When a refund may be considered</h2>
          <p>
            We may, at our sole discretion, issue a full or partial refund or credit if:
          </p>
          <ul>
            <li>Duplicate charge — you were billed twice for the same period</li>
            <li>Billing error — you were charged an incorrect amount due to our error</li>
            <li>
              Service not delivered — a paid period began but you could not access core subscribed
              features for a sustained period due to a Master AEO outage or account provisioning
              failure under our control (excluding third-party AI provider outages outside our
              reasonable control)
            </li>
            <li>Required by applicable consumer law in your jurisdiction</li>
          </ul>

          <h2>When refunds are not available</h2>
          <p>Refunds are typically not available for:</p>
          <ul>
            <li>
              Change of mind after purchase or after using visibility runs, reports, or generated
              plans
            </li>
            <li>
              Unused remaining quota (e.g., unused visibility runs in a billing period)
            </li>
            <li>
              Dissatisfaction with AI outputs, scores, or business outcomes (leads, rankings,
              mentions)
            </li>
            <li>Failure to cancel before renewal</li>
            <li>Account suspension for Terms violations</li>
            <li>
              Partial months after mid-cycle cancellation (unless we state otherwise in writing)
            </li>
          </ul>

          <h2>Trials and promotional access</h2>
          <p>
            If a free trial or promotional period is offered, paid charges that begin after the trial
            ends are subject to this policy. Unused trial time has no cash value.
          </p>

          <h2>Cancellations</h2>
          <ul>
            <li>You may cancel a subscription to stop future renewals.</li>
            <li>
              Cancellation generally takes effect at the end of the current paid period unless
              otherwise stated.
            </li>
            <li>
              Canceling does not automatically entitle you to a refund for the current period.
            </li>
          </ul>
          <p>
            To cancel or request help:{" "}
            <a href="mailto:hello@masteraeo.com">hello@masteraeo.com</a>
          </p>

          <h2>How to request a refund</h2>
          <p>
            Email <a href="mailto:hello@masteraeo.com">hello@masteraeo.com</a> with:
          </p>
          <ul>
            <li>Account email</li>
            <li>Invoice / payment reference (if available)</li>
            <li>Reason for the request</li>
            <li>Relevant dates and details</li>
          </ul>
          <p>
            We aim to respond within 7 business days. Approved refunds are issued to the original
            payment method when possible and may take additional time depending on your bank or
            payment provider.
          </p>

          <h2>Chargebacks</h2>
          <p>
            Please contact us before filing a payment dispute. Unfounded chargebacks may result in
            account suspension while we investigate.
          </p>

          <h2>Policy changes</h2>
          <p>
            We may update this Refund Policy from time to time. The version posted on our website at
            the time of a transaction applies to that charge, unless a newer version is more
            favorable to you and we agree otherwise in writing.
          </p>

          <h2>Contact</h2>
          <p>
            <a href="mailto:hello@masteraeo.com">hello@masteraeo.com</a>
            <br />
            <a href="https://masteraeo.com" target="_blank" rel="noreferrer">
              https://masteraeo.com
            </a>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
