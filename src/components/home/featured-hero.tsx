/**
 * FeaturedHero — the single, massive lead card.
 *
 * One article, full width, big rounded image with a soft hover lift.
 * Sans headline (Figtree), generous padding. This is the page's
 * centerpiece — everything else stays quiet beneath it.
 *
 * Server Component.
 */
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { ArticleCard } from "@/server/services/article-cards";
import { formatDate, type AppLocale, type Dictionary } from "@/i18n";

export function FeaturedHero({
  card,
  locale,
  labels,
}: {
  card: ArticleCard;
  locale: AppLocale;
  labels: Dictionary["article"];
}) {
  return (
    <Link
      href={`/${locale}/article/${card.slug}`}
      className="group block overflow-hidden rounded-4xl border border-hair bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="grid md:grid-cols-2">
        {/* Image */}
        {card.cover && (
          <div className="relative aspect-[16/10] overflow-hidden bg-canvas md:aspect-auto md:min-h-[22rem]">
            <Image
              src={card.cover.url}
              alt={card.cover.altText ?? ""}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
        )}

        {/* Text */}
        <div className="flex flex-col justify-center p-8 sm:p-10">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            {card.categoryName ?? labels.featured}
          </p>
          <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
            {card.title}
          </h1>
          {card.excerpt && (
            <p className="mt-3 line-clamp-3 text-ink-soft">{card.excerpt}</p>
          )}
          <div className="mt-6 flex items-center gap-2 text-sm text-ink-muted">
            {card.authorName && (
              <>
                <span className="font-medium text-ink-soft">
                  {card.authorName}
                </span>
                <span aria-hidden>·</span>
              </>
            )}
            {card.publishedAt && <span>{formatDate(card.publishedAt, locale)}</span>}
            <span
              aria-hidden
              className="ms-auto flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-ink transition-colors group-hover:bg-accent group-hover:text-white"
            >
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
