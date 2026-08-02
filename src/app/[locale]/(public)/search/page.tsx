import type { Metadata } from "next";
import { Locale } from "@prisma/client";
import { Search } from "lucide-react";
import { notFound } from "next/navigation";
import { searchArticleCards } from "@/server/services/article-cards";
import { ArticleListCard } from "@/components/article/article-card";
import { Pagination } from "@/components/article/pagination";
import { getDictionary, isAppLocale, localeHref, type AppLocale } from "@/i18n";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.search.title,
    robots: { index: false }, // search results shouldn't be indexed
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isAppLocale(locale)) notFound();
  const appLocale = locale as AppLocale;
  const dict = await getDictionary(appLocale);

  const q = (sp.q ?? "").trim().slice(0, 200);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const results =
    q.length >= 2
      ? await searchArticleCards({
          locale: appLocale as Locale,
          q,
          page,
          pageSize: PAGE_SIZE,
        })
      : null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        {dict.search.title}
      </h1>

      {/* Plain GET form — zero client JS */}
      <form action={localeHref(appLocale, "/search")} method="GET" className="mt-5 flex gap-2">
        <label htmlFor="q" className="sr-only">
          {dict.search.title}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={dict.search.placeholder}
          minLength={2}
          maxLength={200}
          required
          className="block w-full rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-800"
        >
          <Search className="h-4 w-4" aria-hidden />
          {dict.search.button}
        </button>
      </form>

      {results && (
        <>
          <p className="mt-6 border-b border-zinc-200 pb-3 text-sm text-zinc-500">
            {dict.search.resultsFor}{" "}
            <span className="font-semibold text-zinc-900">“{q}”</span>
            <span className="ms-2 tabular-nums text-zinc-400">
              ({results.total})
            </span>
          </p>

          {results.cards.length === 0 ? (
            <p className="py-16 text-center text-zinc-500">
              {dict.search.noResults}
            </p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {results.cards.map((card) => (
                <ArticleListCard
                  key={card.id}
                  card={card}
                  locale={appLocale}
                  labels={dict.article}
                />
              ))}
            </div>
          )}

          <Pagination
            basePath={localeHref(appLocale, `/search?q=${encodeURIComponent(q)}`)}
            page={page}
            totalPages={results.totalPages}
          />
        </>
      )}
    </div>
  );
}