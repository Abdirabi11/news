// /**
//  * /[locale] — the homepage.
//  *
//  * ISR: statically rendered, revalidated every 300s, AND on-demand
//  * revalidated by the publish-scheduled worker (which POSTs
//  * /api/revalidate with "/{locale}" whenever an article goes live) —
//  * so scheduled publishes appear within seconds, not minutes.
//  *
//  * Layout: FeaturedHero (newest article) + BentoGrid of the next
//  * cards, with a sticky TrendingSidebar alongside on desktop.
//  */
// import { Locale } from "@prisma/client";
// import { getDictionary, type AppLocale } from "@/i18n";
// import { fetchArticleCards } from "@/server/services/article-cards";
// import { FeaturedHero } from "@/components/home/featured-hero";
// import { BentoGrid } from "@/components/home/bento-grid";
// import { TrendingSidebar } from "@/components/article/trending-sidebar";

// export const revalidate = 300;

// export default async function HomePage({
//   params,
// }: {
//   params: Promise<{ locale: string }>;
// }) {
//   const { locale } = await params;
//   const appLocale = locale as AppLocale;
//   const dbLocale = appLocale as Locale;
//   const dict = await getDictionary(appLocale);

//   const { cards } = await fetchArticleCards({
//     locale: dbLocale,
//     page: 1,
//     pageSize: 10,
//   });

//   if (cards.length === 0) {
//     return (
//       <p className="py-24 text-center text-ink-soft">{dict.home.empty}</p>
//     );
//   }

//   const [hero, ...rest] = cards;

//   return (
//     <div className="space-y-12">
//       <FeaturedHero card={hero} locale={appLocale} labels={dict.article} />

//       <div className="grid gap-x-10 gap-y-12 lg:grid-cols-[1fr_320px]">
//         <div className="min-w-0">
//           <h2 className="mb-6 border-b border-hair pb-3 text-lg font-semibold tracking-tight text-ink">
//             {dict.home.latestNews}
//           </h2>
//           <BentoGrid cards={rest} locale={appLocale} labels={dict.article} />
//         </div>

//         <aside className="hidden lg:block">
//           <div className="sticky top-24">
//             <TrendingSidebar
//               locale={appLocale}
//               title={dict.home.mostRead}
//               limit={6}
//             />
//           </div>
//         </aside>
//       </div>
//     </div>
//   );
// }


import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { Locale, ArticleStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getDictionary, formatDate, type AppLocale } from "@/i18n";
import {
  fetchArticleCards,
  type ArticleCard,
} from "@/server/services/article-cards";

export const revalidate = 300;

function Kicker({ name }: { name: string | null }) {
  if (!name) return null;
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sage">
      {name}
    </span>
  );
}

function LeadStory({
  card,
  locale,
}: {
  card: ArticleCard;
  locale: AppLocale;
}) {
  return (
    <article>
      <Link href={`/${locale}/article/${card.slug}`} className="group block">
        {card.cover && (
          <div className="overflow-hidden rounded-2xl">
            <div className="relative aspect-[16/10]">
              <Image
                src={card.cover.url}
                alt={card.cover.altText ?? ""}
                fill
                priority
                sizes="(min-width:1024px) 55vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
          </div>
        )}
        <div className="mt-5">
          <Kicker name={card.categoryName} />
          <h1 className="mt-2 text-3xl font-bold leading-[1.15] tracking-tight text-ink sm:text-4xl">
            {card.title}
          </h1>
          {card.excerpt && (
            <p className="mt-3 text-lg leading-relaxed text-ink-soft">
              {card.excerpt}
            </p>
          )}
          <p className="mt-4 text-sm text-ink-muted">
            {card.authorName && (
              <>
                <span className="font-medium text-ink-soft">
                  {card.authorName}
                </span>{" "}
                ·{" "}
              </>
            )}
            {card.publishedAt && formatDate(card.publishedAt, locale)}
          </p>
        </div>
      </Link>
    </article>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const appLocale = locale as AppLocale;
  const dbLocale = appLocale as Locale;
  const dict = await getDictionary(appLocale);

  // Featured lead (falls back to newest).
  const featured = await prisma.article.findFirst({
    where: {
      status: ArticleStatus.PUBLISHED,
      isFeatured: true,
      translations: { some: { locale: dbLocale } },
    },
    orderBy: { publishedAt: "desc" },
    select: { id: true },
  });

  const { cards: pool } = await fetchArticleCards({
    locale: dbLocale,
    page: 1,
    pageSize: 20,
  });

  if (pool.length === 0 && !featured) {
    return <p className="py-24 text-center text-ink-muted">{dict.home.empty}</p>;
  }

  // Resolve lead + remaining pool (no repeats).
  let lead: ArticleCard;
  let rest: ArticleCard[];
  const featuredCard = featured
    ? pool.find((c) => c.id === featured.id)
    : undefined;
  if (featuredCard) {
    lead = featuredCard;
    rest = pool.filter((c) => c.id !== featuredCard.id);
  } else if (featured) {
    const { cards } = await fetchArticleCards({
      locale: dbLocale,
      where: { id: featured.id },
      page: 1,
      pageSize: 1,
    });
    lead = cards[0] ?? pool[0];
    rest = pool.filter((c) => c.id !== lead.id);
  } else {
    lead = pool[0];
    rest = pool.slice(1);
  }

  // Slice the remaining pool into the page's sections.
  const latest = rest.slice(0, 5); // left column headlines
  const opinion = rest.slice(5, 8); // right column cards
  const watch = rest.slice(8, 11); // multimedia band (needs covers)
  const more = rest.slice(11, 17); // bento grid

  const href = (slug: string) => `/${appLocale}/article/${slug}`;

  return (
    <div>
      {/* 1. Three columns: Latest / Lead / Opinion */}
      <section className="grid gap-10 lg:grid-cols-[0.85fr_1.6fr_0.85fr]">
        {/* Latest */}
        <div className="order-2 lg:order-1">
          <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">
            {dict.home.latestNews}
          </h2>
          <ul className="space-y-5">
            {latest.map((a) => (
              <li key={a.id}>
                <Link href={href(a.slug)} className="block">
                  <Kicker name={a.categoryName} />
                  <h3 className="mt-1 text-[15px] font-semibold leading-snug text-ink">
                    {a.title}
                  </h3>
                  <p className="mt-1 text-xs text-ink-muted">
                    {a.publishedAt && formatDate(a.publishedAt, appLocale)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Lead */}
        <div className="order-1 lg:order-2">
          <LeadStory card={lead} locale={appLocale} />
        </div>

        {/* Opinion */}
        <div className="order-3">
          <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">
            Opinion
          </h2>
          <ul className="space-y-5">
            {opinion.map((a) => (
              <li key={a.id} className="rounded-2xl bg-surface p-5">
                <Link href={href(a.slug)} className="block">
                  <h3 className="text-[15px] font-semibold leading-snug text-ink">
                    {a.title}
                  </h3>
                  {a.authorName && (
                    <p className="mt-2 text-xs italic text-ink-muted">
                      by {a.authorName}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2. Multimedia band — warm surface, play affordance (option b) */}
      {watch.length > 0 && (
        <section className="mt-16 rounded-3xl bg-wood px-6 py-8 sm:px-8">
          <h2 className="mb-6 text-lg font-bold tracking-tight text-ink">
            {dict.home.watch ?? "Watch"}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {watch.map((v) => (
              <Link key={v.id} href={href(v.slug)} className="group block">
                <div className="relative overflow-hidden rounded-2xl">
                  {v.cover && (
                    <div className="relative aspect-video">
                      <Image
                        src={v.cover.url}
                        alt={v.cover.altText ?? ""}
                        fill
                        sizes="(min-width:768px) 30vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-canvas/90 transition-transform group-hover:scale-110">
                      <Play
                        className="ms-0.5 h-6 w-6 text-ink"
                        fill="currentColor"
                        aria-hidden
                      />
                    </span>
                  </span>
                </div>
                <h3 className="mt-3 text-[15px] font-semibold leading-snug text-ink">
                  {v.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. More stories — bento grid */}
      {more.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-lg font-bold tracking-tight text-ink">
            {dict.home.moreStories ?? "More stories"}
          </h2>
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((a) => (
              <Link key={a.id} href={href(a.slug)} className="group block">
                {a.cover && (
                  <div className="overflow-hidden rounded-2xl">
                    <div className="relative aspect-[16/10]">
                      <Image
                        src={a.cover.url}
                        alt={a.cover.altText ?? ""}
                        fill
                        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <Kicker name={a.categoryName} />
                  <h3 className="mt-1.5 text-lg font-semibold leading-snug tracking-tight text-ink">
                    {a.title}
                  </h3>
                  {a.excerpt && (
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {a.excerpt}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-ink-muted">
                    {a.publishedAt && formatDate(a.publishedAt, appLocale)}
                    {" · "}
                    {a.readingTime} {dict.article.minRead}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
