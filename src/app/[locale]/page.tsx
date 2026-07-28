/**
 * /[locale] — the public homepage.
 *
 * ISR: statically rendered, revalidated every 300s, AND on-demand
 * revalidated by the publish-scheduled worker (which POSTs
 * /api/revalidate with "/{locale}" whenever an article goes live) —
 * so scheduled publishes appear within seconds, not minutes.
 *
 * Layout: one featured hero (most recent isFeatured article, falling
 * back to the newest article) + a grid of the latest published
 * articles that have a translation in this locale.
 */
import Link from "next/link";
import Image from "next/image";
import { Locale, ArticleStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getDictionary, formatDate, type AppLocale } from "@/i18n";

export const revalidate = 300;

interface CardData {
  slug: string;
  title: string;
  excerpt: string | null;
  readingTime: number;
  publishedAt: Date | null;
  isBreaking: boolean;
  authorName: string | null;
  categoryName: string | null;
  cover: { url: string; altText: string | null } | null;
}

const cardSelect = (locale: Locale) =>
  ({
    publishedAt: true,
    isBreaking: true,
    author: { select: { name: true } },
    coverImage: { select: { url: true, altText: true } },
    category: {
      select: {
        translations: { where: { locale }, select: { name: true } },
      },
    },
    translations: {
      where: { locale },
      select: { slug: true, title: true, excerpt: true, readingTime: true },
    },
  }) as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCard = (a: any): CardData | null => {
  const t = a.translations[0];
  if (!t) return null;
  return {
    slug: t.slug,
    title: t.title,
    excerpt: t.excerpt,
    readingTime: t.readingTime,
    publishedAt: a.publishedAt,
    isBreaking: a.isBreaking,
    authorName: a.author?.name ?? null,
    categoryName: a.category?.translations[0]?.name ?? null,
    cover: a.coverImage,
  };
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const appLocale = locale as AppLocale;
  const dbLocale = appLocale as Locale;
  const dict = await getDictionary(appLocale);

  const base = {
    status: ArticleStatus.PUBLISHED,
    translations: { some: { locale: dbLocale } },
  };

  // Hero: newest featured article; fall back to the newest article.
  const heroRow =
    (await prisma.article.findFirst({
      where: { ...base, isFeatured: true },
      orderBy: { publishedAt: "desc" },
      select: cardSelect(dbLocale),
    })) ??
    (await prisma.article.findFirst({
      where: base,
      orderBy: { publishedAt: "desc" },
      select: cardSelect(dbLocale),
    }));

  const hero = heroRow ? toCard(heroRow) : null;

  const latestRows = await prisma.article.findMany({
    where: {
      ...base,
      ...(hero && { translations: { some: { locale: dbLocale, NOT: { slug: hero.slug } } } }),
    },
    orderBy: { publishedAt: "desc" },
    take: 9,
    select: cardSelect(dbLocale),
  });
  const latest = latestRows
    .map(toCard)
    .filter((c): c is CardData => c !== null);

  if (!hero) {
    return (
      <p className="py-24 text-center text-zinc-500">{dict.home.empty}</p>
    );
  }

  const articleHref = (slug: string) => `/${appLocale}/article/${slug}`;

  return (
    <div>
      {/* ---- Hero ---- */}
      <section aria-label={dict.article.featured}>
        <Link href={articleHref(hero.slug)} className="group grid gap-6 md:grid-cols-2 md:items-center">
          {hero.cover && (
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-zinc-100">
              <Image
                src={hero.cover.url}
                alt={hero.cover.altText ?? ""}
                fill
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
          )}
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
              {hero.isBreaking && (
                <span className="rounded bg-red-600 px-1.5 py-0.5 text-white">
                  {dict.article.breaking}
                </span>
              )}
              {hero.categoryName && (
                <span className="text-indigo-700">{hero.categoryName}</span>
              )}
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-zinc-900 group-hover:text-indigo-800 sm:text-3xl">
              {hero.title}
            </h1>
            {hero.excerpt && (
              <p className="mt-3 line-clamp-3 text-zinc-600">{hero.excerpt}</p>
            )}
            <p className="mt-4 text-sm text-zinc-500">
              {hero.authorName && (
                <>
                  {dict.article.by}{" "}
                  <span className="font-medium text-zinc-700">
                    {hero.authorName}
                  </span>
                  {" · "}
                </>
              )}
              {hero.publishedAt && formatDate(hero.publishedAt, appLocale)}
              {" · "}
              {hero.readingTime} {dict.article.minRead}
            </p>
          </div>
        </Link>
      </section>

      {/* ---- Latest grid ---- */}
      <section className="mt-12" aria-label={dict.home.latestNews}>
        <h2 className="border-b border-zinc-200 pb-3 text-lg font-semibold tracking-tight">
          {dict.home.latestNews}
        </h2>
        <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((a) => (
            <li key={a.slug}>
              <Link href={articleHref(a.slug)} className="group block">
                {a.cover && (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-zinc-100">
                    <Image
                      src={a.cover.url}
                      alt={a.cover.altText ?? ""}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                )}
                <p className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                  {a.isBreaking && (
                    <span className="rounded bg-red-600 px-1.5 py-0.5 text-white">
                      {dict.article.breaking}
                    </span>
                  )}
                  {a.categoryName && (
                    <span className="text-indigo-700">{a.categoryName}</span>
                  )}
                </p>
                <h3 className="mt-1.5 text-base font-semibold leading-snug text-zinc-900 group-hover:text-indigo-800">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-zinc-600">
                    {a.excerpt}
                  </p>
                )}
                <p className="mt-2 text-xs text-zinc-400">
                  {a.publishedAt && formatDate(a.publishedAt, appLocale)}
                  {" · "}
                  {a.readingTime} {dict.article.minRead}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
