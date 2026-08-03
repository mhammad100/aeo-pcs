import type { Metadata } from "next";
import PublicShell from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Master AEO collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <div className="ma-page">
        <div className="ma-section-label">Legal</div>
        <h1 className="ma-section-title">Privacy Policy</h1>
        <p className="ma-section-copy">Last updated: August 3, 2026</p>

        <div className="ma-legal">
          <h2>Introduction</h2>
          <p>
            Master AEO (“Master AEO,” “we,” “us,” or “our”) operates the Master AEO website and
            application at masteraeo.com (the “Service”). This Privacy Policy explains how we
            collect, use, store, and share personal information when you use the Service.
          </p>
          <p>
            By using the Service, you agree to this Privacy Policy. If you do not agree, do not use
            the Service.
          </p>

          <h2>Information we collect</h2>
          <h3>Account information</h3>
          <ul>
            <li>Email address</li>
            <li>Password (stored as a secure hash; we do not store plaintext passwords)</li>
            <li>Account role and status (e.g., business user)</li>
          </ul>

          <h3>Business profile information</h3>
          <ul>
            <li>Business name, category, city, country, and description</li>
            <li>Website URL</li>
            <li>Optional Google Business Profile link and social media links</li>
            <li>Optional name aliases, target locations, and offerings you provide</li>
          </ul>

          <h3>Service usage data</h3>
          <ul>
            <li>
              Visibility checks, prompts, model responses, mention scores, action plans, checklists,
              and reports you generate
            </li>
            <li>Subscription and billing records (plan, period, invoices, payment status)</li>
            <li>
              Usage and technical logs related to AI processing (e.g., feature used, model
              identifier, token counts, timestamps)
            </li>
          </ul>

          <h3>Technical and device data</h3>
          <ul>
            <li>
              IP address, browser type, device information, and approximate location derived from
              connection data
            </li>
            <li>
              Cookies or similar technologies needed for authentication, session management, and
              basic analytics
            </li>
          </ul>

          <h3>Communications</h3>
          <ul>
            <li>
              Messages you send us (e.g., to{" "}
              <a href="mailto:hello@masteraeo.com">hello@masteraeo.com</a>)
            </li>
          </ul>

          <h2>How we use information</h2>
          <p>We use information to:</p>
          <ul>
            <li>Create and manage accounts and authenticate users</li>
            <li>Provide AI visibility checks, scoring, action plans, reports, and dashboards</li>
            <li>Enforce plan limits and manage subscriptions and billing</li>
            <li>Improve, secure, and troubleshoot the Service</li>
            <li>Communicate about account, product, billing, and support matters</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>AI / third-party processing</h2>
          <p>
            To run visibility checks and generate plans and content, we send relevant business and
            prompt data to third-party AI providers (for example, large language model APIs). Those
            providers process data under their own terms and privacy policies. Do not submit
            sensitive personal data you are not authorized to share.
          </p>

          <h2>How we share information</h2>
          <p>We do not sell your personal information. We may share information with:</p>
          <ul>
            <li>
              Service providers (hosting, databases, email, payment processors, AI providers) who
              process data on our behalf
            </li>
            <li>
              Professional advisors or authorities when required by law or to protect rights and
              safety
            </li>
            <li>
              A successor entity in connection with a merger, acquisition, or asset sale
            </li>
          </ul>

          <h2>Data retention</h2>
          <p>
            We retain account, business, visibility, and billing data for as long as your account is
            active and as needed to provide the Service, resolve disputes, enforce agreements, and
            meet legal and accounting requirements. You may request deletion of your account; some
            records may be retained where legally required.
          </p>

          <h2>Security</h2>
          <p>
            We use reasonable technical and organizational measures to protect information (including
            hashed passwords and access controls). No method of transmission or storage is 100%
            secure.
          </p>

          <h2>Your choices and rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, or export
            personal data, or object to certain processing. To make a request, email{" "}
            <a href="mailto:hello@masteraeo.com">hello@masteraeo.com</a>. We may need to verify your
            identity before responding.
          </p>
          <p>
            You may update business profile information in the Service settings. You may request
            account closure by contacting us.
          </p>

          <h2>Cookies</h2>
          <p>
            We use cookies or similar technologies for essential functions such as keeping you signed
            in. You can control cookies through your browser settings; disabling them may affect
            Service functionality.
          </p>

          <h2>Children’s privacy</h2>
          <p>
            The Service is intended for business users and is not directed to children under 16. We
            do not knowingly collect personal information from children.
          </p>

          <h2>International transfers</h2>
          <p>
            If you access the Service from outside the country where our systems are hosted, your
            information may be transferred and processed in other countries that may have different
            data protection laws.
          </p>

          <h2>Changes</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the updated version
            with a new “Last updated” date. Continued use of the Service after changes means you
            accept the updated policy.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this Privacy Policy:{" "}
            <a href="mailto:hello@masteraeo.com">hello@masteraeo.com</a>
            <br />
            Website:{" "}
            <a href="https://masteraeo.com" target="_blank" rel="noreferrer">
              https://masteraeo.com
            </a>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
