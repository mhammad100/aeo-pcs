import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="ma-footer">
      <div className="ma-footer-inner">
        <div>
          <Link href="/" className="ma-header-brand">
            Master AEO
          </Link>
          <p style={{ marginTop: 12 }}>
            AI visibility for local and growing businesses. Know how assistants talk about you — then
            fix it.
          </p>
        </div>
        <div>
          <h4>Product</h4>
          <p>
            <Link href="/#features">Features</Link>
          </p>
          <p>
            <Link href="/#pricing">Pricing</Link>
          </p>
          <p>
            <Link href="/features">All features</Link>
          </p>
          <p>
            <Link href="/login">Log in</Link>
          </p>
        </div>
        <div>
          <h4>Company</h4>
          <p>
            <Link href="/#about">About</Link>
          </p>
          <p>
            <Link href="/about">Our story</Link>
          </p>
          <p>
            <a href="mailto:hello@masteraeo.com">Contact</a>
          </p>
        </div>
        <div>
          <h4>Get started</h4>
          <p>
            <Link href="/signup">Request access</Link>
          </p>
          <p style={{ marginTop: 16 }}>© {new Date().getFullYear()} Master AEO</p>
        </div>
      </div>
    </footer>
  );
}
