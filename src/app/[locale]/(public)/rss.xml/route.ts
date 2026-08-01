import { notFound } from "next/navigation";
import { Locale, ArticleStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getDictionary, isAppLocale } from "@/i18n";
 
export const revalidate = 900;
 
const escapeXml = (s: string): string =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
 
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ locale: string }> },
) {
  const { locale } = await ctx.params;
  if (!isAppLocale(locale)) notFound();
 
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  const dict = await getDictionary(locale);
 
  const translations = await prisma.articleTranslation.findMany({
    where: {
      locale: locale as Locale,
      article: { status: ArticleStatus.PUBLISHED },
    },
    orderBy: { article: { publishedAt: "desc" } },
    take: 20,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      article: {
        select: {
          publishedAt: true,
          author: { select: { name: true } },
          category: {
            select: {
              translations: {
                where: { locale: locale as Locale },
                select: { name: true },
              },
            },
          },
        },
      },
    },
  });
 
  const feedUrl = `${siteUrl}/${locale}/rss.xml`;
  const homeUrl = `${siteUrl}/${locale}`;
 
  const items = translations
    .map((t) => {
      const link = `${siteUrl}/${locale}/article/${t.slug}`;
      const category = t.article.category?.translations[0]?.name;
      return `    <item>
      <title>${escapeXml(t.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      ${t.article.publishedAt ? `<pubDate>${t.article.publishedAt.toUTCString()}</pubDate>` : ""}
      ${t.excerpt ? `<description>${escapeXml(t.excerpt)}</description>` : ""}
      ${t.article.author.name ? `<dc:creator>${escapeXml(t.article.author.name)}</dc:creator>` : ""}
      ${category ? `<category>${escapeXml(category)}</category>` : ""}
    </item>`;
    })
    .join("\n");
 
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(dict.site.name)}</title>
    <link>${homeUrl}</link>
    <description>${escapeXml(dict.site.tagline)}</description>
    <language>${locale}</language>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
 
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
 