import type { Metadata } from "next";
import PublicShell from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms governing your use of Master AEO.",
};

export default function TermsPage() {
  return (
    <PublicShell>
      <div className="ma-page">
        <div className="ma-section-label">Legal</div>
        <h1 className="ma-section-title">Terms and Conditions</h1>
        <p className="ma-section-copy">Last updated: August 3, 2026</p>

        <div className="ma-legal">
          <h2>Agreement</h2>
          <p>
            These Terms and Conditions (“Terms”) govern your access to and use of Master AEO at
            masteraeo.com (the “Service”), operated by Master AEO (“we,” “us,” or “our”).
          </p>
          <p>
            By creating an account, logging in, or using the Service, you agree to these Terms and
            our Privacy Policy. If you are using the Service on behalf of a business, you represent
            that you have authority to bind that business.
          </p>

          <h2>The Service</h2>
          <p>
            Master AEO provides tools to help businesses measure and improve how they appear in AI
            assistant-style answers, including:
          </p>
          <ul>
            <li>Business profile management</li>
            <li>Prompt-based visibility checks and scoring</li>
            <li>Action plans, checklists, insights, and reports</li>
            <li>Subscription-based access according to your plan</li>
          </ul>
          <p>
              Features, limits (such as visibility checks per month), and pricing may change over time.
          </p>

          <h2>Accounts</h2>
          <ul>
            <li>You must provide accurate account and business information and keep it updated.</li>
            <li>
              You are responsible for safeguarding login credentials and for activity under your
              account.
            </li>
            <li>
              We may suspend or terminate accounts that are inactive, unpaid, abusive, or in
              violation of these Terms.
            </li>
            <li>
              Access may be invite-only or otherwise limited at our discretion until public signup is
              enabled.
            </li>
          </ul>

          <h2>Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for unlawful, deceptive, or harmful purposes</li>
            <li>Attempt to reverse engineer, scrape, overload, or disrupt the Service</li>
            <li>Share account access in a way that violates plan limits or security</li>
            <li>Submit content you do not have rights to use</li>
            <li>Misrepresent visibility results or use reports in a misleading way</li>
            <li>
              Use the Service to infringe intellectual property or privacy rights of others
            </li>
          </ul>

          <h2>Plans, billing, and subscriptions</h2>
          <ul>
            <li>
              Paid plans grant access for a billing period subject to plan limits and features.
            </li>
            <li>
              Fees, currency, and entitlements are shown at purchase and may be updated for future
              periods.
            </li>
            <li>
              Unless otherwise stated, subscriptions renew for successive periods until canceled.
            </li>
            <li>
              You may cancel from Subscription in your account. Cancellation stops future renewals
              and typically takes effect at the end of the current paid period; you keep access until
              then unless we state otherwise.
            </li>
            <li>Failure to pay may result in suspension, past-due status, or cancellation.</li>
            <li>Taxes may apply where required.</li>
          </ul>
          <p>Refunds are governed by our Refund Policy.</p>

          <h2>AI-generated and visibility results</h2>
          <p>
            Visibility scores, model answers, citations, action plans, and generated content are
            informational estimates. AI outputs can be incomplete, outdated, or incorrect. Master AEO
            does not guarantee:
          </p>
          <ul>
            <li>That your business will appear in any AI assistant</li>
            <li>Ranking, traffic, leads, or revenue outcomes</li>
            <li>
              That checks mirror any specific third-party AI product at all times
            </li>
          </ul>
          <p>
            You remain responsible for reviewing outputs before publishing or acting on them.
          </p>

          <h2>Intellectual property</h2>
          <ul>
            <li>
              The Service, branding, software, and documentation are owned by Master AEO or its
              licensors.
            </li>
            <li>You retain ownership of your business content you submit.</li>
            <li>
              You grant us a license to host and process that content solely to provide and improve
              the Service.
            </li>
            <li>
              Generated reports and plans are licensed to you for your internal business use under
              your active subscription, subject to these Terms.
            </li>
          </ul>

          <h2>Confidentiality</h2>
          <p>
            You should not upload secrets, payment card numbers, or highly sensitive personal data
            into prompts or profiles unless necessary and authorized.
          </p>

          <h2>Third-party services</h2>
          <p>
            The Service may rely on third-party hosting, AI, analytics, or payment providers. Their
            services are subject to their own terms. We are not responsible for third-party outages
            or policy changes outside our control.
          </p>

          <h2>Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY
            LAW, WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON-INFRINGEMENT.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, MASTER AEO SHALL NOT BE LIABLE FOR INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR LOST PROFITS DAMAGES. OUR TOTAL LIABILITY FOR
            CLAIMS ARISING OUT OF THE SERVICE SHALL NOT EXCEED THE AMOUNTS YOU PAID TO US FOR THE
            SERVICE IN THE TWELVE (12) MONTHS BEFORE THE CLAIM.
          </p>

          <h2>Indemnity</h2>
          <p>
            You agree to indemnify and hold Master AEO harmless from claims arising out of your
            misuse of the Service, your content, or your violation of these Terms or applicable law.
          </p>

          <h2>Termination</h2>
          <p>
            You may stop using the Service at any time. We may suspend or terminate access for
            breach, non-payment, or risk to the Service. Upon termination, your right to access the
            Service ends; sections that by nature should survive (including intellectual property,
            disclaimers, and liability limits) will survive.
          </p>

          <h2>Changes to the Service or Terms</h2>
          <p>
            We may modify the Service or these Terms. Material changes will be posted with an updated
            date. Continued use after changes constitutes acceptance.
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
