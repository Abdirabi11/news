import Link from "next/link";
import Image from "next/image";
import type { ArticleCard } from "@/server/services/article-cards";
import { formatDate, type AppLocale, type Dictionary } from "@/i18n";

export function LatestStrip({
  cards,
  locale,
  labels,
  heading,
}: {
  cards: ArticleCard[];
  locale: AppLocale;
  labels: Dictionary["article"];
  heading: string;
}) {
  if (cards.length === 0) return null;

  return (
    <section className="mt-12" aria-label={heading}>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
        {heading}
      </h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={`/${locale}/article/${card.slug}`}
            className="group flex flex-col gap-3"
          >
            {card.cover && (
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-canvas">
                <Image
                  src={card.cover.url}
                  alt={card.cover.altText ?? ""}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </div>
            )}
            <div>
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-accent">
                {card.title}
              </h3>
              <p className="mt-1.5 text-xs text-ink-muted">
                {card.publishedAt && formatDate(card.publishedAt, locale)}
                {" · "}
                {card.readingTime} {labels.minRead}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}