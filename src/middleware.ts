import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_LOCALE, isAppLocale } from "@/i18n";

const LOCALE_COOKIE = "NEXT_LOCALE";

function firstSegment(pathname: string): string {
  return pathname.split("/")[1] ?? "";
}

/** Drops the first path segment. "/en/category/x" -> "/category/x"; "/en" -> "/". */
function stripFirstSegment(pathname: string): string {
  const rest = pathname.split("/").slice(2).join("/");
  return rest ? `/${rest}` : "/";
}

/** Adds a locale prefix. withLocalePrefix("so", "/category/x") -> "/so/category/x". */
function withLocalePrefix(locale: string, pathname: string): string {
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}

export function middleware(req: NextRequest) {

  const { pathname, search } = req.nextUrl;
  const seg = firstSegment(pathname);

  // "/en" or "/en/..." typed explicitly -> permanently redirect to the
  // clean URL. 308 (not 307) so search engines drop the "/en" variant
  // from the index instead of treating both as live duplicates.
  if (seg === DEFAULT_LOCALE) {
    const clean = stripFirstSegment(pathname);
    const url = new URL(`${clean}${search}`, req.url);
    return NextResponse.redirect(url, 308);
  }

  // "/so/..." or "/ar/..." — already correctly prefixed, pass through.
  if (isAppLocale(seg)) {
    return NextResponse.next();
  }

  // Unprefixed path. A returning visitor who previously chose a
  // non-default locale (via the language switcher, which sets this
  // cookie) is sent to their prefixed locale. Everyone else gets the
  // default locale rewritten in transparently, so the address bar
  // never shows "/en".
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  if (
    cookieLocale &&
    isAppLocale(cookieLocale) &&
    cookieLocale !== DEFAULT_LOCALE
  ) {
    const url = new URL(`${withLocalePrefix(cookieLocale, pathname)}${search}`, req.url);
    return NextResponse.redirect(url, 307);
  }

  const url = new URL(`${withLocalePrefix(DEFAULT_LOCALE, pathname)}${search}`, req.url);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
     /*
     * Match all paths EXCEPT:
     *  - api routes (never need locale rewriting)
     *  - _next/static, _next/image (build assets)
     *  - _next/data (client-nav data requests already carry locale)
     *  - favicon, robots, sitemap, manifest (root static files)
     *  - anything with a file extension (.jpg, .css, .woff2, .xml …)
     *
     * The trailing (?!...) negative lookahead on the extension is the
     * key: it stops the middleware firing on every image and font,
     * which is where most of the "firing constantly" overhead comes from.
     */
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.[\\w]+$).*)",
  ],
};