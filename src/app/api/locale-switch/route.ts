/**
 * GET /api/locale-switch?to=ar&path=/en/article/some-slug
 *
 * The server half of the path-preserving locale switcher. Parses
 * the current path, looks up the equivalent slug in the target
 * locale via the translation tables, and 307-redirects:
 *
 *   /en/article/<slug>   -> sibling ArticleTranslation slug
 *   /en/category/<slug>  -> sibling CategoryTranslation slug
 *   /en/tag/<slug>       -> sibling TagTranslation slug
 *   /en/author/<slug>    -> same slug (authorSlug is locale-agnostic)
 *   /en/search?q=…       -> same query, target locale
 *   anything else        -> target-locale homepage
 *
 * Missing sibling (partial translation) -> target homepage: honest
 * behavior for e.g. the seeded Transit Plan article, which has no
 * Arabic edition to land on.
 */
import { NextRequest, NextResponse } from "next/server";
import { Locale } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { DEFAULT_LOCALE, isAppLocale, localeHref, type AppLocale } from "@/i18n";
 
export const dynamic = "force-dynamic";
 
export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") ?? "";
  const rawPath = req.nextUrl.searchParams.get("path") ?? "/";
 
  if (!isAppLocale(to)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
 
  const redirect = (path: string) =>
    NextResponse.redirect(new URL(path, req.url), 307);
  const home = localeHref(to, "/");

  // Only ever treat `path` as an internal path (no open redirects).
  if (!rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return redirect(home);
  }

  const [pathname, query = ""] = rawPath.split("?");
  const segments = pathname.split("/").filter(Boolean); // [locale?, kind, slug?]

  // Under prefix-except-default, the default locale (en) has NO prefix
  // segment — "/category/x" is already an "en" path, not an invalid one.
  const hasPrefix = isAppLocale(segments[0]);
  const from: AppLocale = hasPrefix ? (segments[0] as AppLocale) : DEFAULT_LOCALE;
  const rest = hasPrefix ? segments.slice(1) : segments;

  if (from === to) return redirect(home);

  const kind = rest[0];
  const slug = rest[1] ? decodeURIComponent(rest[1]) : undefined;
 
  try {
    if (kind === "article" && slug) {
      const current = await prisma.articleTranslation.findUnique({
        where: { slug_locale: { slug, locale: from as Locale } },
        select: { articleId: true },
      });
      if (current) {
        const sibling = await prisma.articleTranslation.findUnique({
          where: {
            articleId_locale: {
              articleId: current.articleId,
              locale: to as Locale,
            },
          },
          select: { slug: true },
        });
        if (sibling) return redirect(localeHref(to, `/article/${sibling.slug}`));
      }
      return redirect(home);
    }
 
    if (kind === "category" && slug) {
      const current = await prisma.categoryTranslation.findUnique({
        where: { slug_locale: { slug, locale: from as Locale } },
        select: { categoryId: true },
      });
      if (current) {
        const sibling = await prisma.categoryTranslation.findUnique({
          where: {
            categoryId_locale: {
              categoryId: current.categoryId,
              locale: to as Locale,
            },
          },
          select: { slug: true },
        });
        if (sibling) return redirect(localeHref(to, `/category/${sibling.slug}`));
      }
      return redirect(home);
    }
 
    if (kind === "tag" && slug) {
      const current = await prisma.tagTranslation.findUnique({
        where: { slug_locale: { slug, locale: from as Locale } },
        select: { tagId: true },
      });
      if (current) {
        const sibling = await prisma.tagTranslation.findUnique({
          where: {
            tagId_locale: { tagId: current.tagId, locale: to as Locale },
          },
          select: { slug: true },
        });
        if (sibling) return redirect(localeHref(to, `/tag/${sibling.slug}`));
      }
      return redirect(home);
    }
 
    if (kind === "author" && slug) {
      // authorSlug is global — same profile, new locale.
      return redirect(localeHref(to, `/author/${slug}`));
    }

    if (kind === "search") {
      return redirect(localeHref(to, `/search${query ? `?${query}` : ""}`));
    }
  } catch (err) {
    console.error("[locale-switch]", err);
  }
 
  return redirect(home);
}