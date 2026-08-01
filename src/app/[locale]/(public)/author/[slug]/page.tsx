import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Locale } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { fetchArticleCards } from "@/server/services/article-cards";
import { getDictionary, isAppLocale, type AppLocale } from "@/i18n";
import { ArticleListing } from "@/components/listing/article-listing";

export const revalidate = 300;
const PAGE_SIZE = 12;

async function resolveAuthor(slug: string) {
  return prisma.user.findUnique({
    where: { authorSlug: slug },
    select: { id: true, name: true, bio: true, isActive: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await resolveAuthor(slug);
  if (!author) return {};
  return {
    title: author.name ?? "Author",
    description: author.bio ?? `Articles by ${author.name}.`,
  };
}

export default async function AuthorPage({
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

  const author = await resolveAuthor(slug);
  if (!author || !author.isActive) notFound();

  const page = Math.max(1, Number(pageParam) || 1);
  const dict = await getDictionary(appLocale);

  const { cards, totalPages } = await fetchArticleCards({
    locale: dbLocale,
    where: { authorId: author.id },
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <ArticleListing
      kicker={dict.nav?.author ?? "Author"}
      title={author.name ?? "Author"}
      description={author.bio}
      cards={cards}
      page={page}
      totalPages={totalPages}
      basePath={`/${appLocale}/author/${slug}`}
      locale={appLocale}
      minRead={dict.article.minRead}
      emptyText={dict.home.empty}
    />
  );
}
