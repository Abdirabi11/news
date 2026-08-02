import { Suspense } from "react";
import Link from "next/link";
import { Locale } from "@prisma/client";
import { getDictionary, localeHref, type AppLocale } from "@/i18n";
import { navSections } from "@/server/services/navigation";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { HeaderNav, type NavLink } from "@/components/layout/header-nav";

export async function SiteHeader({ locale }: { locale: AppLocale }) {
  const [dict, sections] = await Promise.all([
    getDictionary(locale),
    navSections(locale as Locale),
  ]);

  // Keep it lean: at most 5 sections in the top bar; the rest live
  // on the homepage and in the mobile menu.
  const links: NavLink[] = sections
    .slice(0, 5)
    .map((s) => ({ name: s.name, slug: s.slug }));

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="mx-auto max-w-6xl">
        <div className="relative flex items-center justify-between gap-4 rounded-full border border-hair bg-surface/70 px-5 py-2.5 shadow-soft backdrop-blur-md">
          {/* Wordmark */}
          <Link
            href={localeHref(locale, "/")}
            className="shrink-0 text-lg font-semibold tracking-tight text-ink transition-colors hover:text-accent"
          >
            {dict.site.name}
          </Link>

          {/* Interactive nav (client) */}
          <HeaderNav locale={locale} links={links} dict={dict} />

          {/* Locale switcher (desktop) */}
          <div className="hidden shrink-0 md:block">
            <Suspense fallback={null}>
              <LocaleSwitcher current={locale} />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}