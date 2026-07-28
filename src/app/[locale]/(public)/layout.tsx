/**
 * (public) route group layout — now composed from the news-portal
 * chrome (SiteHeader + SiteFooter). Replaces the earlier minimal
 * header/footer. Still a Server Component; the header fetches nav
 * data and renders client islands where needed.
 */
import { Locale } from "@prisma/client";
import { getDictionary, type AppLocale } from "@/i18n";
import { navSections } from "@/server/services/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const appLocale = locale as AppLocale; // validated by the root layout

  // Footer needs sections too; fetched here so the header's copy and
  // this one dedupe within the same render where possible.
  const [dict, sections] = await Promise.all([
    getDictionary(appLocale),
    navSections(appLocale as Locale),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={appLocale} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <SiteFooter locale={appLocale} dict={dict} sections={sections} />
    </div>
  );
}
