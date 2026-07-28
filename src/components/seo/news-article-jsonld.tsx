/**
 * NewsArticleJsonLd — Google NewsArticle structured data.
 *
 * Emits <script type="application/ld+json"> with the fields Google's
 * documentation marks as recommended for NewsArticle rich results:
 * headline, image, datePublished, dateModified, author (with url),
 * publisher, mainEntityOfPage, plus inLanguage and articleSection.
 *
 * Serialization safety: JSON.stringify output has "<" escaped to
 * \u003c — without that, an article whose title/excerpt contains
 * "</script>" would terminate the script tag and inject markup.
 * (This is the ONE place in the codebase dangerouslySetInnerHTML is
 * allowed, and only because the payload is fully escaped JSON.)
 *
 * Server Component — renders inline in the page body, which is
 * where Google expects and reads JSON-LD (no <head> access needed).
 */

interface NewsArticleJsonLdProps {
  headline: string;
  url: string;
  description?: string;
  imageUrls?: string[];
  datePublished?: string; // ISO 8601
  dateModified?: string; // ISO 8601
  authorName?: string;
  authorUrl?: string;
  locale: string;
  section?: string;
}

const SITE_NAME = "Newsroom";

export function NewsArticleJsonLd({
  headline,
  url,
  description,
  imageUrls = [],
  datePublished,
  dateModified,
  authorName,
  authorUrl,
  locale,
  section,
}: NewsArticleJsonLdProps) {
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");

  const data = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    // Google truncates headlines around 110 chars in results.
    headline: headline.slice(0, 110),
    ...(description && { description }),
    ...(imageUrls.length > 0 && { image: imageUrls }),
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    ...(authorName && {
      author: [
        {
          "@type": "Person",
          name: authorName,
          ...(authorUrl && { url: authorUrl }),
        },
      ],
    }),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      // Point at a real logo asset (112x112+ px) before launch.
      ...(siteUrl && {
        logo: { "@type": "ImageObject", url: `${siteUrl}/logo.png` },
      }),
    },
    inLanguage: locale,
    ...(section && { articleSection: section }),
    isAccessibleForFree: true,
  };

  return (
    <script
      type="application/ld+json"
      // Escaped: "<" can never appear, so the tag can't be broken out of.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replaceAll("<", "\\u003c"),
      }}
    />
  );
}
