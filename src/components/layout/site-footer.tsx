/**
 * SiteFooter — rich, multi-column newspaper-style footer.
 *
 * Server Component. Columns: Sections (live from the DB), About,
 * Follow, Languages, plus a newsletter signup (posts to the
 * subscribe endpoint — a thin route to be added in a later batch;
 * the form degrades to a normal GET/POST target meanwhile) and a
 * legal row.
 */
import Link from "next/link";
import { Newspaper } from "lucide-react";
import type { NavSection } from "@/server/services/navigation";
import { LOCALES, LOCALE_NAMES, type AppLocale, type Dictionary } from "@/i18n";

export function SiteFooter({
  locale,
  dict,
  sections,
}: {
  locale: AppLocale;
  dict: Dictionary;
  sections: NavSection[];
}) {
  const heading =
    "mb-3 text-xs font-bold uppercase tracking-wider text-ink";
  const linkCls =
    "block py-1 text-sm text-ink-soft transition-colors hover:text-brand";

  return (
    <footer className="mt-16 border-t border-hair bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand + newsletter (spans 2) */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-white">
                <Newspaper className="h-4 w-4" aria-hidden />
              </span>
              <span className="font-serif text-lg font-bold text-ink">
                {dict.site.name}
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink-soft">
              {dict.site.tagline}
            </p>

            <form
              action={`/${locale}/subscribe`}
              method="POST"
              className="mt-5 max-w-sm"
            >
              <label
                htmlFor="footer-email"
                className="text-xs font-semibold uppercase tracking-wider text-ink-muted"
              >
                {dict.footer.newsletter}
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="footer-email"
                  name="email"
                  type="email"
                  required
                  placeholder={dict.footer.emailPlaceholder}
                  className="min-w-0 flex-1 rounded-md border border-hair bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  {dict.footer.subscribe}
                </button>
              </div>
            </form>
          </div>

          {/* Sections */}
          <div>
            <h3 className={heading}>{dict.footer.sections}</h3>
            {sections.slice(0, 6).map((s) => (
              <Link
                key={s.slug}
                href={`/${locale}/category/${s.slug}`}
                className={linkCls}
              >
                {s.name}
              </Link>
            ))}
          </div>

          {/* About */}
          <div>
            <h3 className={heading}>{dict.footer.about}</h3>
            <Link href={`/${locale}/about`} className={linkCls}>
              {dict.footer.aboutUs}
            </Link>
            <Link href={`/${locale}/contact`} className={linkCls}>
              {dict.footer.contact}
            </Link>
            <a href={`/${locale}/rss.xml`} className={linkCls}>
              RSS
            </a>
          </div>

          {/* Languages */}
          <div>
            <h3 className={heading}>{dict.footer.languages}</h3>
            {LOCALES.map((l) => (
              <Link key={l} href={`/${l}`} className={linkCls}>
                {LOCALE_NAMES[l]}
              </Link>
            ))}
          </div>
        </div>

        {/* Legal row */}
        <div className="mt-10 border-t border-hair pt-6 text-center text-xs text-ink-muted">
          © {new Date().getFullYear()} {dict.site.name}. {dict.footer.rights}
        </div>
      </div>
    </footer>
  );
}
