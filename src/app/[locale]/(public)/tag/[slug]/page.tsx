import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Locale } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { fetchArticleCards } from "@/server/services/article-cards";
import { ArticleListCard } from "@/components/article/article-card";
import { Pagination } from "@/components/article/pagination";
import { getDictionary, isAppLocale, localeHref, type AppLocale } from "@/i18n";

export const revalidate = 300;

const PAGE_SIZE = 12;

async function getTag(slug: string, locale: Locale) {
  return prisma.tagTranslation.findUnique({
    where: { slug_locale: { slug, locale } },
    select: { name: true, tagId: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return {};
  const tag = await getTag(slug, locale as Locale);
  if (!tag) return {};
  return { title: `#${tag.name}` };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  if (!isAppLocale(locale)) notFound();
  const appLocale = locale as AppLocale;
  const dbLocale = appLocale as Locale;

  const tag = await getTag(slug, dbLocale);
  if (!tag) notFound();

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [dict, { cards, totalPages }] = await Promise.all([
    getDictionary(appLocale),
    fetchArticleCards({
      locale: dbLocale,
      where: { tags: { some: { tagId: tag.tagId } } },
      page,
      pageSize: PAGE_SIZE,
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          <span className="text-indigo-700">#</span>
          {tag.name}
        </h1>
      </header>

      <div className="divide-y divide-zinc-100">
        {cards.map((card) => (
          <ArticleListCard
            key={card.id}
            card={card}
            locale={appLocale}
            labels={dict.article}
          />
        ))}
      </div>

      {cards.length === 0 && (
        <p className="py-16 text-center text-zinc-500">{dict.home.empty}</p>
      )}

      <Pagination
        basePath={localeHref(appLocale, `/tag/${slug}`)}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}