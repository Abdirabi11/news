import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Locale, ArticleStatus } from "@prisma/client";
import { type JSONContent } from "@tiptap/react";
import { prisma } from "@/server/db/client";
import { cache } from "react";
import {
  getDictionary,
  formatDate,
  isAppLocale,
  localeHref,
  localeUrl,
  LOCALES,
  type AppLocale,
} from "@/i18n";
import { RichContent } from "@/components/article/rich-content";
import { ViewTracker } from "@/components/article/view-tracker";
import { NewsArticleJsonLd } from "@/components/seo/news-article-jsonld";

export const revalidate = 300;
export const dynamicParams = true;

// ----------------------------------------------------------------
// generateStaticParams
// ----------------------------------------------------------------
// export async function generateStaticParams() {
//   const rows = await prisma.articleTranslation.findMany({
//     where: { article: { status: ArticleStatus.PUBLISHED } },
//     select: { slug: true, locale: true },
//     take: 500,
//     orderBy: { article: { publishedAt: "desc" } },
//   });

//   return rows
//     .filter((r) => (LOCALES as readonly string[]).includes(r.locale))
//     .map((r) => ({ locale: r.locale, slug: r.slug }));
// }

export async function generateStaticParams() {
  // Returning an empty array stops Next.js from hammering the database during build.
  // Because `dynamicParams = true` is set, articles will safely generate on-demand
  // the first time a user visits them, and then stay cached as fast static pages!
  return [];
}

// ----------------------------------------------------------------
// Shared fetch wrapped in React cache()
// ----------------------------------------------------------------
const getArticle = cache(async (slug: string, locale: Locale) => {
  const translation = await prisma.articleTranslation.findUnique({
    where: { slug_locale: { slug, locale } },
    include: {
      article: {
        include: {
          author: { select: { name: true, authorSlug: true, image: true } },
          coverImage: {
            select: { url: true, altText: true, width: true, height: true },
          },
          category: {
            select: {
              translations: {
                where: { locale },
                select: { name: true, slug: true },
              },
            },
          },
          translations: { select: { locale: true, slug: true } },
        },
      },
    },
  });

  if (!translation) return null;
  if (translation.article.status !== ArticleStatus.PUBLISHED) return null;
  return translation;
});

// ----------------------------------------------------------------
// Metadata
// ----------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return {};

  const t = await getArticle(slug, locale as Locale);
  if (!t) return {};

  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  const url = localeUrl(siteUrl, locale as AppLocale, `/article/${t.slug}`);

  const languages = Object.fromEntries(
    t.article.translations.map((sibling) => [
      sibling.locale,
      localeUrl(siteUrl, sibling.locale as AppLocale, `/article/${sibling.slug}`),
    ]),
  );

  const title = t.seoTitle ?? t.title;
  const description = t.seoDescription ?? t.excerpt ?? undefined;
  const ogImage = t.ogImageUrl ?? t.article.coverImage?.url;

  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "Lower Shabelle Media",
      publishedTime: t.article.publishedAt?.toISOString(),
      modifiedTime: t.updatedAt.toISOString(),
      authors: t.article.author.name ? [t.article.author.name] : undefined,
      images: ogImage ? [{ url: ogImage }] : undefined,
      locale,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) notFound();
  const appLocale = locale as AppLocale;

  const [dict, t] = await Promise.all([
    getDictionary(appLocale),
    getArticle(slug, appLocale as Locale),
  ]);
  if (!t) notFound();

  const article = t.article;
  const category = article.category?.translations[0] ?? null;

  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  const url = localeUrl(siteUrl, appLocale, `/article/${t.slug}`);
  const jsonLdImages = [t.ogImageUrl ?? article.coverImage?.url].filter(
    (v): v is string => Boolean(v),
  );

  return (
    <article className="mx-auto max-w-2xl">
      <ViewTracker articleId={t.articleId} />

      <NewsArticleJsonLd
        headline={t.title}
        url={url}
        description={t.seoDescription ?? t.excerpt ?? undefined}
        imageUrls={jsonLdImages}
        datePublished={article.publishedAt?.toISOString()}
        dateModified={t.updatedAt.toISOString()}
        authorName={article.author.name ?? undefined}
        authorUrl={
          article.author.authorSlug
            ? localeUrl(siteUrl, appLocale, `/author/${article.author.authorSlug}`)
            : undefined
        }
        locale={appLocale}
        section={category?.name}
      />

      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
        {article.isBreaking && (
          <span className="rounded bg-red-600 px-1.5 py-0.5 text-white">
            {dict.article.breaking}
          </span>
        )}
        {category && (
          <Link
            href={localeHref(appLocale, `/category/${category.slug}`)}
            className="text-indigo-700 hover:underline"
          >
            {category.name}
          </Link>
        )}
      </p>

      <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
        {t.title}
      </h1>
      {t.excerpt && (
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">
          {t.excerpt}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3 border-y border-zinc-200 py-4 text-sm">
        {article.author.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.author.image}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
        )}
        <div>
          {article.author.name && (
            <p className="font-medium text-zinc-900">
              {dict.article.by}{" "}
              {article.author.authorSlug ? (
                <Link
                  href={localeHref(appLocale, `/author/${article.author.authorSlug}`)}
                  className="hover:text-indigo-700 hover:underline"
                >
                  {article.author.name}
                </Link>
              ) : (
                article.author.name
              )}
            </p>
          )}
          <p className="text-zinc-500">
            {article.publishedAt && (
              <time dateTime={article.publishedAt.toISOString()}>
                {dict.article.publishedOn}{" "}
                {formatDate(article.publishedAt, appLocale)}
              </time>
            )}
            {" · "}
            {t.readingTime} {dict.article.minRead}
          </p>
        </div>
      </div>

      {article.coverImage && (
        <figure className="mt-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-zinc-100">
            <Image
              src={article.coverImage.url}
              alt={article.coverImage.altText ?? ""}
              fill
              priority
              sizes="(min-width: 768px) 42rem, 100vw"
              className="object-cover"
            />
          </div>
          {article.coverImage.altText && (
            <figcaption className="mt-2 text-center text-xs text-zinc-400">
              {article.coverImage.altText}
            </figcaption>
          )}
        </figure>
      )}

      <div className="mt-8">
        <RichContent content={t.content as JSONContent} />
      </div>
    </article>
  );
}