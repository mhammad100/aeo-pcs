"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";

const links = [
  { href: "/#features", label: "Product" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#about", label: "About" },
];

type PublicHeaderProps = {
  sticky?: boolean;
};

export default function PublicHeader({ sticky = false }: PublicHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 960px)");
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className={`ma-header${sticky ? " ma-header-sticky" : ""}`}>
      <div className="ma-header-inner">
        <Link href="/" className="ma-brand-lockup ma-header-brand" onClick={() => setMenuOpen(false)}>
          <BrandMark size={34} variant="onDark" />
          <span className="ma-brand-lockup-copy">
            <span className="ma-brand-lockup-name">
              Master<em>AEO</em>
            </span>
          </span>
        </Link>
        <div className="ma-header-end">
          <nav className="ma-nav" aria-label="Primary">
            {links.map((l) => {
              const active =
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
            <Link href="/login" className="ma-header-signin">
              Sign in
            </Link>
            <Link href="/signup" className="ma-btn ma-btn-primary ma-btn-compact ma-header-cta">
              <span className="ma-header-cta-full">Check your score</span>
              <span className="ma-header-cta-short">Get started</span>
            </Link>
            <button
              type="button"
              className="ma-header-menu-btn"
              aria-expanded={menuOpen}
              aria-controls={panelId}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className={`ma-header-menu-icon${menuOpen ? " is-open" : ""}`} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`ma-header-backdrop${menuOpen ? " is-open" : ""}`}
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />
      <div
        id={panelId}
        className={`ma-header-drawer${menuOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        hidden={!menuOpen}
      >
        <nav className="ma-header-drawer-nav" aria-label="Mobile">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ma-header-drawer-actions">
          <Link href="/login" className="ma-btn ma-btn-ghost" onClick={() => setMenuOpen(false)}>
            Sign in
          </Link>
          <Link
            href="/signup"
            className="ma-btn ma-btn-primary"
            onClick={() => setMenuOpen(false)}
          >
            Check your score
          </Link>
        </div>
      </div>
    </header>
  );
}
