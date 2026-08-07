"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#about", label: "About" },
];

export default function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="ma-header">
      <Link href="/" className="ma-brand-lockup ma-header-brand">
        <BrandMark size={36} />
        <span className="ma-brand-lockup-copy">
          <span className="ma-brand-lockup-name">
            Master <em>AEO</em>
          </span>
          <span className="ma-brand-lockup-tag">Answer engine optimization</span>
        </span>
      </Link>
      <nav className="ma-nav" aria-label="Primary">
        {links.map((l) => {
          const active =
            (l.href.includes("features") && pathname === "/features") ||
            (l.href.includes("pricing") && pathname === "/pricing") ||
            (l.href.includes("about") && pathname === "/about");
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{ color: active ? "var(--ma-ink)" : undefined }}
            >
              {l.label}
            </Link>
          );
        })}
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
