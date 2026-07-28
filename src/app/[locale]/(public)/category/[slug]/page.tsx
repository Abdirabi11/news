import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Locale } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { fetchArticleCards } from "@/server/services/article-cards";
import { ArticleListCard } from "@/components/article/article-card";
import { Pagination } from "@/components/article/pagination";
import { getDictionary, isAppLocale, type AppLocale } from "@/i18n";

export const revalidate = 300;

const PAGE_SIZE = 12;

async function getCategory(slug: string, locale: Locale) {
  return prisma.categoryTranslation.findUnique({
    where: { slug_locale: { slug, locale } },
    select: { name: true, description: true, categoryId: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return {};
  const category = await getCategory(slug, locale as Locale);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description ?? undefined,
  };
}

export default async function CategoryPage({
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

  const category = await getCategory(slug, dbLocale);
  if (!category) notFound();

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [dict, { cards, totalPages }] = await Promise.all([
    getDictionary(appLocale),
    fetchArticleCards({
      locale: dbLocale,
      where: { categoryId: category.categoryId },
      page,
      pageSize: PAGE_SIZE,
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-2 text-zinc-600">{category.description}</p>
        )}
      </header>

      <div className="divide-y divide-zinc-100">
        {cards.map((card) => (
          <ArticleListCard
            key={card.id}
            card={card}
            locale={appLocale}
            labels={dict.article}
            hideCategory
          />
        ))}
      </div>

      {cards.length === 0 && (
        <p className="py-16 text-center text-zinc-500">{dict.home.empty}</p>
      )}

      <Pagination
        basePath={`/${appLocale}/category/${slug}`}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
