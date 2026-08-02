/**
 * BentoGrid — the spacious card grid beneath the hero.
 *
 * Soft rounded cards (rounded-2xl), subtle ring, gentle hover lift.
 * Three columns on desktop, generous gap. Sans headlines. This is
 * the "breathing room" surface — no dense multi-column bands.
 *
 * Server Component.
 */
import Link from "next/link";
import Image from "next/image";
import type { ArticleCard } from "@/server/services/article-cards";
import { formatDate, localeHref, type AppLocale, type Dictionary } from "@/i18n";

function BentoCard({
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
      href={localeHref(locale, `/article/${card.slug}`)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-hair bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      {card.cover && (
        <div className="relative aspect-[16/10] overflow-hidden bg-canvas">
          <Image
            src={card.cover.url}
            alt={card.cover.altText ?? ""}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          {card.categoryName ?? labels.featured}
        </p>
        <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-ink group-hover:text-accent">
          {card.title}
        </h3>
        {card.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm text-ink-soft">
            {card.excerpt}
          </p>
        )}
        <p className="mt-4 text-xs text-ink-muted">
          {card.publishedAt && formatDate(card.publishedAt, locale)}
          {" · "}
          {card.readingTime} {labels.minRead}
        </p>
      </div>
    </Link>
  );
}

export function BentoGrid({
  cards,
  locale,
  labels,
}: {
  cards: ArticleCard[];
  locale: AppLocale;
  labels: Dictionary["article"];
}) {
  if (cards.length === 0) return null;
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <BentoCard key={card.id} card={card} locale={locale} labels={labels} />
      ))}
    </div>
  );
}