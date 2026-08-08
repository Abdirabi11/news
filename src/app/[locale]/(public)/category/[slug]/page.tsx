import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Locale } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { fetchArticleCards } from "@/server/services/article-cards";
import { BentoGrid } from "@/components/home/bento-grid";
import { Pagination } from "@/components/article/pagination";
import { getDictionary, isAppLocale, localeHref, type AppLocale } from "@/i18n";

export const revalidate = 300;

const PAGE_SIZE = 12;

async function getCategory(slug: string, locale: Locale) {
  // console.log("[getCategory] slug=%o locale=%o", slug, locale);
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

  // locale is "en" | "so" | "ar" — already matches the lowercase Prisma enum.
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

  // NO .toUpperCase(). The Locale enum is lowercase (en/so/ar); the URL
  // segment is already lowercase; they match directly.
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
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-hair pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          {dict.article.inCategory}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-3 max-w-2xl text-ink-soft">
            {category.description}
          </p>
        )}
      </header>

      <div className="mt-10">
        {cards.length === 0 ? (
          <p className="py-16 text-center text-ink-soft">{dict.home.empty}</p>
        ) : (
          <BentoGrid cards={cards} locale={appLocale} labels={dict.article} />
        )}
      </div>

      <Pagination
        basePath={localeHref(appLocale, `/category/${slug}`)}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}