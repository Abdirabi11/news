import Link from "next/link";
import Image from "next/image";
import { type ArticleCard } from "@/server/services/article-cards";
import { formatDate, localeHref, type AppLocale, type Dictionary } from "@/i18n";

interface ArticleListCardProps {
  card: ArticleCard;
  locale: AppLocale;
  labels: Dictionary["article"];
  /** Hide the category kicker (e.g. on the category page itself). */
  hideCategory?: boolean;
}

export function ArticleListCard({
  card,
  locale,
  labels,
  hideCategory = false,
}: ArticleListCardProps) {
  const href = localeHref(locale, `/article/${card.slug}`);

  return (
    <article className="group flex gap-4 py-5 sm:gap-6">
      {card.cover && (
        <Link
          href={href}
          className="relative hidden aspect-[16/10] w-40 shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:block sm:w-52"
          tabIndex={-1}
          aria-hidden
        >
          <Image
            src={card.cover.url}
            alt=""
            fill
            sizes="13rem"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>
      )}

      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
          {card.isBreaking && (
            <span className="rounded bg-red-600 px-1.5 py-0.5 text-white">
              {labels.breaking}
            </span>
          )}
          {!hideCategory && card.categoryName && card.categorySlug && (
            <Link
              href={localeHref(locale, `/category/${card.categorySlug}`)}
              className="text-indigo-700 hover:underline"
            >
              {card.categoryName}
            </Link>
          )}
        </p>

        <h3 className="mt-1 text-lg font-semibold leading-snug text-zinc-900">
          <Link href={href} className="group-hover:text-indigo-800">
            {card.title}
          </Link>
        </h3>

        {card.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-sm text-zinc-600">
            {card.excerpt}
          </p>
        )}

        <p className="mt-2 text-xs text-zinc-400">
          {card.authorName && (
            <>
              {labels.by}{" "}
              {card.authorSlug ? (
                <Link
                  href={localeHref(locale, `/author/${card.authorSlug}`)}
                  className="font-medium text-zinc-600 hover:text-indigo-700"
                >
                  {card.authorName}
                </Link>
              ) : (
                <span className="font-medium text-zinc-600">
                  {card.authorName}
                </span>
              )}
              {" · "}
            </>
          )}
          {card.publishedAt && formatDate(card.publishedAt, locale)}
          {" · "}
          {card.readingTime} {labels.minRead}
        </p>
      </div>
    </article>
  );
}