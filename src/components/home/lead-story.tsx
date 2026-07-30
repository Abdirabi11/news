import Link from "next/link";
import type { ArticleCard } from "@/server/services/article-cards";
import { formatDate, type AppLocale, type Dictionary } from "@/i18n";
import { FeaturedHero } from "./featured-hero";

export function LeadStory({
  lead,
  secondary,
  locale,
  labels,
}: {
  lead: ArticleCard;
  secondary: ArticleCard[];
  locale: AppLocale;
  labels: Dictionary["article"];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-stretch">
      <FeaturedHero card={lead} locale={locale} labels={labels} />

      {secondary.length > 0 && (
        <aside className="flex flex-col lg:border-s lg:border-hair lg:ps-6">
          {secondary.map((card, i) => (
            <Link
              key={card.id}
              href={`/${locale}/article/${card.slug}`}
              className={`group block py-4 first:pt-0 last:pb-0 ${
                i > 0 ? "border-t border-hair" : ""
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                {card.categoryName ?? labels.featured}
              </p>
              <h3 className="mt-1.5 text-base font-semibold leading-snug text-ink group-hover:text-accent">
                {card.title}
              </h3>
              <p className="mt-1.5 text-xs text-ink-muted">
                {card.publishedAt && formatDate(card.publishedAt, locale)}
                {" · "}
                {card.readingTime} {labels.minRead}
              </p>
            </Link>
          ))}
        </aside>
      )}
    </div>
  );
}