"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Menu, X } from "lucide-react";
import { LOCALES, localeHref, type AppLocale, type Dictionary } from "@/i18n";

export interface NavLink {
  name: string;
  slug: string;
}

export function HeaderNav({
  locale,
  links,
  dict,
}: {
  locale: AppLocale;
  links: NavLink[];
  dict: Dictionary;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Desktop category links */}
      <nav
        aria-label="Sections"
        className="hidden items-center gap-1 md:flex"
      >
        {links.map((l) => (
          <Link
            key={l.slug}
            href={localeHref(locale, `/category/${l.slug}`)}
            className="rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            {l.name}
          </Link>
        ))}
      </nav>

      {/* Right cluster: search + mobile menu button */}
      <div className="flex items-center gap-1">
        {searchOpen ? (
          <form
            action={localeHref(locale, "/search")}
            method="GET"
            className="flex items-center"
          >
            <input
              ref={searchRef}
              name="q"
              type="search"
              required
              minLength={2}
              placeholder={dict.search.placeholder}
              className="w-40 rounded-full border border-ring bg-surface px-4 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft sm:w-52"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="ms-1 rounded-full p-2 text-ink-muted hover:bg-canvas hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={dict.nav.search}
            className="rounded-full p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <Search className="h-[1.15rem] w-[1.15rem]" aria-hidden />
          </button>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="rounded-full p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-ink md:hidden"
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <Menu className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <div className="absolute inset-x-0 top-full mt-2 px-4 md:hidden">
          <div className="overflow-hidden rounded-2xl border border-hair bg-surface p-2 shadow-lift">
            {links.map((l) => (
              <Link
                key={l.slug}
                href={localeHref(locale, `/category/${l.slug}`)}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
              >
                {l.name}
              </Link>
            ))}
            <div className="my-2 h-px bg-hair" />
            <div className="flex gap-1.5 px-2 py-1">
              {LOCALES.map((l) => (
                <Link
                  key={l}
                  href={localeHref(l, "/")}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                    l === locale
                      ? "bg-accent text-white"
                      : "bg-canvas text-ink-muted hover:text-ink"
                  }`}
                >
                  {l}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}