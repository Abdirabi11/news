import Link from "next/link";
import Image from "next/image";
import type { ArticleCard } from "@/server/services/article-cards";
import { formatDate, type AppLocale, type Dictionary } from "@/i18n";
import { BentoGrid } from "./bento-grid";

export function SectionBand({
  name,
  slug,
  cards,
  locale,
  labels,
  seeAll,
  variant = "grid",
}: {
  name: string;
  slug: string;
  cards: ArticleCard[];
  locale: AppLocale;
  labels: Dictionary["article"];
  seeAll: string;
  variant?: "lead" | "grid";
}) {
  if (cards.length === 0) return null;

  const categoryHref = `/${locale}/category/${slug}`;
  const [lead, ...rest] = cards;

  return (
    <section className="mt-14" aria-label={name}>
      <div className="flex items-center justify-between border-b border-hair pb-3">
        <Link
          href={categoryHref}
          className="text-lg font-semibold tracking-tight text-ink hover:text-accent"
        >
          {name}
        </Link>
        <Link
          href={categoryHref}
          className="text-sm font-medium text-ink-muted hover:text-accent"
        >
          {seeAll}
        </Link>
      </div>

      {variant === "grid" ? (
        <div className="mt-6">
          <BentoGrid cards={cards.slice(0, 3)} locale={locale} labels={labels} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Link
            href={`/${locale}/article/${lead.slug}`}
            className="group block overflow-hidden rounded-2xl border border-hair bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            {lead.cover && (
              <div className="relative aspect-[16/10] overflow-hidden bg-canvas">
                <Image
                  src={lead.cover.url}
                  alt={lead.cover.altText ?? ""}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
            )}
            <div className="p-6">
              <h3 className="text-lg font-semibold leading-snug text-ink group-hover:text-accent">
                {lead.title}
              </h3>
              {lead.excerpt && (
                <p className="mt-2 line-clamp-2 text-sm text-ink-soft">
                  {lead.excerpt}
                </p>
              )}
              <p className="mt-3 text-xs text-ink-muted">
                {lead.publishedAt && formatDate(lead.publishedAt, locale)}
                {" · "}
                {lead.readingTime} {labels.minRead}
              </p>
            </div>
          </Link>

          <ul className="flex flex-col divide-y divide-hair lg:border-s lg:border-hair lg:ps-6 lg:divide-y-0">
            {rest.slice(0, 3).map((card) => (
              <li key={card.id}>
                <Link
                  href={`/${locale}/article/${card.slug}`}
                  className="group block py-3 first:pt-0"
                >
                  <h4 className="text-sm font-semibold leading-snug text-ink group-hover:text-accent">
                    {card.title}
                  </h4>
                  <p className="mt-1 text-xs text-ink-muted">
                    {card.publishedAt && formatDate(card.publishedAt, locale)}
                    {" · "}
                    {card.readingTime} {labels.minRead}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}