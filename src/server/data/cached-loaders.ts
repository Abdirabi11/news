/**
 * Request-scoped cached data loaders.
 *
 * React's cache() memoizes a function for the duration of ONE server
 * request. If the page component AND generateMetadata both call
 * getCategory("technology", "en"), the Prisma query runs ONCE and the
 * second call gets the memoized promise. This is what kills your
 * duplicate [getCategory] logs.
 *
 * Scope: cache() is per-request, NOT cross-request. For cross-request
 * caching (surviving between visitors) you'd layer unstable_cache or
 * ISR on top — see notes at the bottom.
 *
 * Rule of thumb:
 *   - cache()          -> dedupe within one render (metadata + page)
 *   - unstable_cache   -> persist a query result across requests with
 *                         a TTL + tags (good for taxonomy that rarely
 *                         changes)
 *   - ISR (revalidate) -> cache the whole rendered page
 */
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { Locale } from "@prisma/client";
import { prisma } from "@/server/db/client";

/**
 * Per-request deduped category lookup. Use this in BOTH the page and
 * generateMetadata so they share one query.
 */
export const getCategory = cache(
  async (slug: string, locale: Locale) => {
    return prisma.categoryTranslation.findUnique({
      where: { slug_locale: { slug, locale } },
      select: { name: true, description: true, categoryId: true },
    });
  },
);

/**
 * Same idea for an article's translation lookup by slug+locale.
 */
export const getArticleTranslation = cache(
  async (slug: string, locale: Locale) => {
    return prisma.articleTranslation.findUnique({
      where: { slug_locale: { slug, locale } },
      select: {
        title: true,
        excerpt: true,
        content: true,
        seoTitle: true,
        seoDescription: true,
        article: {
          select: {
            id: true,
            status: true,
            publishedAt: true,
            author: { select: { name: true, authorSlug: true } },
            coverImage: { select: { url: true, altText: true } },
          },
        },
      },
    });
  },
);

/**
 * Taxonomy changes rarely, so cache it ACROSS requests with a tag we
 * can bust when categories are edited. This turns a per-request query
 * into a shared, revalidatable cache entry.
 *
 * Call revalidateTag("categories") from your category server actions
 * after any create/update/delete.
 */
export const getAllCategories = unstable_cache(
  async (locale: Locale) => {
    const rows = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        translations: {
          where: { locale },
          select: { name: true, slug: true },
          take: 1,
        },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.translations[0]?.name ?? "(unnamed)",
      slug: c.translations[0]?.slug ?? "",
    }));
  },
  ["all-categories"], // cache key prefix
  { tags: ["categories"], revalidate: 3600 }, // 1h TTL + tag-based busting
);