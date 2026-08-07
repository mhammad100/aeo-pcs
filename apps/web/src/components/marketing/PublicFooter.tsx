import Link from "next/link";
import BrandMark from "@/components/BrandMark";

const FOOTER_LINKS = {
  product: [
    { href: "/#features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/features", label: "Product overview" },
  ],
  company: [
    { href: "/#about", label: "About" },
    { href: "/about", label: "Our story" },
    { href: "mailto:hello@masteraeo.com", label: "Contact" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms" },
    { href: "/refund", label: "Refund policy" },
  ],
} as const;

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="ma-footer">
      <div className="ma-footer-glow" aria-hidden />

      <div className="ma-footer-inner">
        <div className="ma-footer-top">
          <div className="ma-footer-brand">
            <Link href="/" className="ma-brand-lockup ma-footer-logo">
              <BrandMark size={28} variant="onDark" />
              <span className="ma-brand-lockup-copy">
                <span className="ma-brand-lockup-name">
                  Master<em>AEO</em>
                </span>
              </span>
            </Link>
            <p className="ma-footer-tagline">
              AI visibility for local and growing businesses. Know how assistants talk about you,
              then fix it.
            </p>
          </div>

          <div className="ma-footer-nav">
            <div className="ma-footer-col">
              <h4>Product</h4>
              <ul>
                {FOOTER_LINKS.product.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ma-footer-col">
              <h4>Company</h4>
              <ul>
                {FOOTER_LINKS.company.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith("mailto:") ? (
                      <a href={link.href}>{link.label}</a>
                    ) : (
                      <Link href={link.href}>{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="ma-footer-col">
              <h4>Legal</h4>
              <ul>
                {FOOTER_LINKS.legal.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="ma-footer-bottom">
          <p>© {year} Master AEO. All rights reserved.</p>
          <div className="ma-footer-bottom-links">
            <Link href="/#pricing">Pricing</Link>
            <a href="mailto:hello@masteraeo.com">hello@masteraeo.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
