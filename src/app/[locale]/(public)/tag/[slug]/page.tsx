import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Locale } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { fetchArticleCards } from "@/server/services/article-cards";
import { getDictionary, isAppLocale, type AppLocale } from "@/i18n";
import { ArticleListing } from "@/components/listing/article-listing";

export const revalidate = 300;
const PAGE_SIZE = 12;

async function resolveTag(slug: string, locale: Locale) {
  return prisma.tagTranslation.findFirst({
    where: { slug, locale },
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
  const tag = await resolveTag(slug, locale as Locale);
  if (!tag) return {};
  return { title: `#${tag.name}`, description: `Articles tagged ${tag.name}.` };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, slug } = await params;
  const { page: pageParam } = await searchParams;
  if (!isAppLocale(locale)) notFound();
  const appLocale = locale as AppLocale;
  const dbLocale = locale as Locale;

  const tag = await resolveTag(slug, dbLocale);
  if (!tag) notFound();

  const page = Math.max(1, Number(pageParam) || 1);
  const dict = await getDictionary(appLocale);

  const { cards, totalPages } = await fetchArticleCards({
    locale: dbLocale,
    where: { tags: { some: { tagId: tag.tagId } } },
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <ArticleListing
      kicker={dict.nav?.tag ?? "Tag"}
      title={`#${tag.name}`}
      cards={cards}
      page={page}
      totalPages={totalPages}
      basePath={`/${appLocale}/tag/${slug}`}
      locale={appLocale}
      minRead={dict.article.minRead}
      emptyText={dict.home.empty}
    />
  );
}
