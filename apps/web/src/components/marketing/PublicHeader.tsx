"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export default function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="ma-header">
      <Link href="/" className="ma-header-brand">
        masteraeo
      </Link>
      <nav className="ma-nav" aria-label="Primary">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{ color: pathname === l.href ? "var(--ma-ink)" : undefined }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="ma-header-actions">
        <Link href="/login" className="ma-btn ma-btn-ghost" style={{ padding: "8px 16px" }}>
          Log in
        </Link>
        <Link href="/signup" className="ma-btn ma-btn-primary" style={{ padding: "8px 16px" }}>
          Get started
        </Link>
      </div>
    </header>
  );
}
