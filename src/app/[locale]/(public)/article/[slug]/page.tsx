import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Locale, ArticleStatus } from "@prisma/client";
import { type JSONContent } from "@tiptap/react";
import { prisma } from "@/server/db/client";
import { getDictionary, formatDate, isAppLocale, type AppLocale } from "@/i18n";
import { RichContent } from "@/components/article/rich-content";
import { ViewTracker } from "@/components/article/view-tracker";
import { NewsArticleJsonLd } from "@/components/seo/news-article-jsonld";

export const revalidate = 300;

// ----------------------------------------------------------------
// Shared fetch (used by both the page and generateMetadata; Next
// deduplicates identical Prisma calls per request via React cache
// only for fetch(), so keep it to one helper both call — the query
// runs twice at build/revalidate time, which is fine for ISR).
// ----------------------------------------------------------------

async function getArticle(slug: string, locale: Locale) {
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
          // Sibling translations -> hreflang alternates + future
          // path-preserving locale switching.
          translations: { select: { locale: true, slug: true } },
        },
      },
    },
  });

  if (!translation) return null;
  if (translation.article.status !== ArticleStatus.PUBLISHED) return null;
  return translation;
}

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
  const url = `${siteUrl}/${locale}/article/${t.slug}`;

  // hreflang alternates, built from sibling translations.
  const languages = Object.fromEntries(
    t.article.translations.map((sibling) => [
      sibling.locale,
      `${siteUrl}/${sibling.locale}/article/${sibling.slug}`,
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
      siteName: "Newsroom",
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
  const url = `${siteUrl}/${appLocale}/article/${t.slug}`;
  const jsonLdImages = [t.ogImageUrl ?? article.coverImage?.url].filter(
    (v): v is string => Boolean(v),
  );

  return (
    <article className="mx-auto max-w-2xl">
      {/* View beacon — client-side, so ISR cache hits are counted too */}
      <ViewTracker articleId={t.articleId} />

      {/* Structured data for Google News / rich results */}
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
            ? `${siteUrl}/${appLocale}/author/${article.author.authorSlug}`
            : undefined
        }
        locale={appLocale}
        section={category?.name}
      />

      {/* Kicker: breaking flag + category */}
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
        {article.isBreaking && (
          <span className="rounded bg-red-600 px-1.5 py-0.5 text-white">
            {dict.article.breaking}
          </span>
        )}
        {category && (
          <Link
            href={`/${appLocale}/category/${category.slug}`}
            className="text-indigo-700 hover:underline"
          >
            {category.name}
          </Link>
        )}
      </p>

      {/* Headline & standfirst */}
      <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
        {t.title}
      </h1>
      {t.excerpt && (
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">
          {t.excerpt}
        </p>
      )}

      {/* Byline */}
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
                  href={`/${appLocale}/author/${article.author.authorSlug}`}
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

      {/* Cover image — the LCP candidate, hence next/image + priority */}
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

      {/* Body — whitelist-based Tiptap JSON renderer */}
      <div className="mt-8">
        <RichContent content={t.content as JSONContent} />
      </div>
    </article>
  );
}
