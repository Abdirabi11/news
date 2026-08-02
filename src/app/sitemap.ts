/**
 * sitemap.xml — Next.js metadata route (served at /sitemap.xml).
 *
 * Emits, per locale: the homepage, every category page, and every
 * PUBLISHED article translation. Article and category entries carry
 * alternates.languages built from their translation siblings, which
 * Next renders as xhtml:link hreflang annotations — the sitemap
 * equivalent of the hreflang tags the article pages already emit.
 *
 * Scale note: fine up to ~50k URLs (the sitemap protocol limit).
 * Past that, switch to generateSitemaps() sharding — the queries
 * below already shape the data the way sharding would need.
 *
 * The separate Google News sitemap (48h window, news: namespace)
 * lives at /news-sitemap.xml as a manual route handler, because
 * this convention cannot emit custom XML namespaces.
 */
import type { MetadataRoute } from "next";
import { ArticleStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { LOCALES, localeUrl, type AppLocale } from "@/i18n";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  const entries: MetadataRoute.Sitemap = [];

  // ---- Homepages ----
  // en is canonical at siteUrl itself (no "/en") — prefix-except-default.
  const homeLanguages = Object.fromEntries(
    LOCALES.map((l) => [l, localeUrl(siteUrl, l, "/")]),
  );
  for (const locale of LOCALES) {
    entries.push({
      url: localeUrl(siteUrl, locale, "/"),
      changeFrequency: "hourly",
      priority: 1,
      alternates: { languages: homeLanguages },
    });
  }

  // ---- Category pages ----
  const categories = await prisma.category.findMany({
    select: {
      updatedAt: true,
      translations: { select: { locale: true, slug: true } },
    },
  });
  for (const category of categories) {
    const languages = Object.fromEntries(
      category.translations.map((t) => [
        t.locale,
        localeUrl(siteUrl, t.locale as AppLocale, `/category/${t.slug}`),
      ]),
    );
    for (const t of category.translations) {
      entries.push({
        url: localeUrl(siteUrl, t.locale as AppLocale, `/category/${t.slug}`),
        lastModified: category.updatedAt,
        changeFrequency: "daily",
        priority: 0.7,
        alternates: { languages },
      });
    }
  }

  // ---- Published articles ----
  const articles = await prisma.article.findMany({
    where: { status: ArticleStatus.PUBLISHED },
    select: {
      publishedAt: true,
      translations: {
        select: { locale: true, slug: true, updatedAt: true },
      },
    },
    orderBy: { publishedAt: "desc" },
  });
  for (const article of articles) {
    const languages = Object.fromEntries(
      article.translations.map((t) => [
        t.locale,
        localeUrl(siteUrl, t.locale as AppLocale, `/article/${t.slug}`),
      ]),
    );
    for (const t of article.translations) {
      entries.push({
        url: localeUrl(siteUrl, t.locale as AppLocale, `/article/${t.slug}`),
        lastModified: t.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: { languages },
      });
    }
  }

  return entries;
}