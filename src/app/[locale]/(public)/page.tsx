/**
 * /[locale] — the magazine homepage.
 *
 * ISR (revalidate 300s) + on-demand revalidation from the publish
 * worker. Structure:
 *   1. LeadStory     — hero + secondary rail (full width)
 *   2. LatestStrip   — 4 compact newest cards (full width)
 *   3. Section bands beside a sticky trending rail (2-col grid)
 *
 * All data comes from existing services (article-cards, trending)
 * plus the section-bands helper. Server Component throughout; the
 * only client JS on this page is TrendingSidebar's parent chrome
 * (it's actually a server component too) — so the homepage ships
 * effectively zero page-level JS.
 *
 * RTL: the lead story's secondary rail and the sticky trending rail
 * both flip sides automatically via CSS grid source-order + logical
 * borders; no direction-specific code.
 */
import { Locale, ArticleStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getDictionary, type AppLocale } from "@/i18n";
import {
  fetchArticleCards,
  type ArticleCard,
} from "@/server/services/article-cards";
import { sectionBands } from "@/server/services/section-bands";
import { LeadStory } from "@/components/home/lead-story";
import { LatestStrip } from "@/components/home/latest-strip";
import { SectionBand } from "@/components/home/section-band";
import { TrendingSidebar } from "@/components/article/trending-sidebar";

export const revalidate = 300;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const appLocale = locale as AppLocale;
  const dbLocale = appLocale as Locale;
  const dict = await getDictionary(appLocale);

  // The hero prefers a featured article; find its id first (cheap),
  // then fetch the top cards. If a featured story exists it becomes
  // the lead and is excluded from the rest so nothing repeats.
  const featured = await prisma.article.findFirst({
    where: {
      status: ArticleStatus.PUBLISHED,
      isFeatured: true,
      translations: { some: { locale: dbLocale } },
    },
    orderBy: { publishedAt: "desc" },
    select: { id: true },
  });

  // One list feeds hero (if no featured) + secondary rail + latest
  // strip. Fetch a couple extra to backfill when the featured lead
  // is pulled out of the pool.
  const [{ cards: pool }, bands] = await Promise.all([
    fetchArticleCards({ locale: dbLocale, page: 1, pageSize: 10 }),
    sectionBands(dbLocale, { bandCount: 4, perBand: 4 }),
  ]);

  if (pool.length === 0 && !featured) {
    return (
      <p className="py-24 text-center text-ink-soft">{dict.home.empty}</p>
    );
  }

  // Resolve the lead: the featured card if present (it may or may not
  // already be in `pool`), otherwise the newest article.
  let lead: ArticleCard;
  let rest: ArticleCard[];
  const featuredCard = featured
    ? pool.find((c) => c.id === featured.id)
    : undefined;

  if (featured && featuredCard) {
    lead = featuredCard;
    rest = pool.filter((c) => c.id !== featured.id);
  } else if (featured && !featuredCard) {
    // Featured article is older than the top 10 — fetch it directly.
    const [{ cards: leadOnly }] = await Promise.all([
      fetchArticleCards({
        locale: dbLocale,
        where: { id: featured.id },
        page: 1,
        pageSize: 1,
      }),
    ]);
    lead = leadOnly[0] ?? pool[0];
    rest = pool.filter((c) => c.id !== lead.id);
  } else {
    lead = pool[0];
    rest = pool.slice(1);
  }

  const secondary = rest.slice(0, 4); // up to 4 stacked headlines
  const latest = rest.slice(4, 8); // up to 4 compact cards

  return (
    <div>
      <LeadStory
        lead={lead}
        secondary={secondary}
        locale={appLocale}
        labels={dict.article}
      />

      <LatestStrip
        cards={latest}
        locale={appLocale}
        labels={dict.article}
        heading={dict.home.latestNews}
      />

      {/* Section bands beside the sticky trending rail */}
      <div className="grid gap-x-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {bands.map((band, i) => (
            <SectionBand
              key={band.slug}
              name={band.name}
              slug={band.slug}
              cards={band.cards}
              locale={appLocale}
              labels={dict.article}
              seeAll={dict.nav.seeAll}
              // Alternate rhythm: lead layout on even bands, grid on odd.
              variant={i % 2 === 0 ? "lead" : "grid"}
            />
          ))}
        </div>

        {/* Sticky rail — follows through the section bands */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <TrendingSidebar
              locale={appLocale}
              title={dict.home.mostRead}
              limit={6}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
