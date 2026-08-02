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

async function getAuthor(slug: string) {
  return prisma.user.findUnique({
    where: { authorSlug: slug, isActive: true },
    select: { id: true, name: true, bio: true, image: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author?.name) return {};
  return { title: author.name, description: author.bio ?? undefined };
}

export default async function AuthorPage({
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

  const author = await getAuthor(slug);
  if (!author) notFound();

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [dict, { cards, totalPages }] = await Promise.all([
    getDictionary(appLocale),
    fetchArticleCards({
      locale: appLocale as Locale,
      where: { authorId: author.id },
      page,
      pageSize: PAGE_SIZE,
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Profile header */}
      <header className="flex items-start gap-5 border-b border-zinc-200 pb-6">
        {author.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.image}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700"
          >
            {author.name?.charAt(0) ?? "?"}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            {dict.author.articlesBy}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-900">
            {author.name}
          </h1>
          {author.bio && (
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {author.bio}
            </p>
          )}
        </div>
      </header>

      {/* Their articles in this locale */}
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
        basePath={localeHref(appLocale, `/author/${slug}`)}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}