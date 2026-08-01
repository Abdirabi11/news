import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ArticleCard } from "@/server/services/article-cards";
import { formatDate, type AppLocale } from "@/i18n";

function Kicker({ name }: { name: string | null }) {
  if (!name) return null;
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sage">
      {name}
    </span>
  );
}

function LeadCard({
  card,
  locale,
  minRead,
}: {
  card: ArticleCard;
  locale: AppLocale;
  minRead: string;
}) {
  return (
    <Link href={`/${locale}/article/${card.slug}`} className="group block">
      <div className="grid gap-6 md:grid-cols-2">
        {card.cover && (
          <div className="overflow-hidden rounded-2xl">
            <div className="relative aspect-[16/10]">
              <Image
                src={card.cover.url}
                alt={card.cover.altText ?? ""}
                fill
                priority
                sizes="(min-width:768px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
          </div>
        )}
        <div className="flex flex-col justify-center">
          <Kicker name={card.categoryName} />
          <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
            {card.title}
          </h2>
          {card.excerpt && (
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              {card.excerpt}
            </p>
          )}
          <p className="mt-4 text-sm text-ink-muted">
            {card.authorName && (
              <>
                <span className="font-medium text-ink-soft">
                  {card.authorName}
                </span>{" "}
                ·{" "}
              </>
            )}
            {card.publishedAt && formatDate(card.publishedAt, locale)}
            {" · "}
            {card.readingTime} {minRead}
          </p>
        </div>
      </div>
    </Link>
  );
}

function GridCard({
  card,
  locale,
  minRead,
}: {
  card: ArticleCard;
  locale: AppLocale;
  minRead: string;
}) {
  return (
    <Link href={`/${locale}/article/${card.slug}`} className="group block">
      {card.cover && (
        <div className="overflow-hidden rounded-2xl">
          <div className="relative aspect-[16/10]">
            <Image
              src={card.cover.url}
              alt={card.cover.altText ?? ""}
              fill
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
        </div>
      )}
      <div className="mt-4">
        <Kicker name={card.categoryName} />
        <h3 className="mt-1.5 text-lg font-semibold leading-snug tracking-tight text-ink">
          {card.title}
        </h3>
        {card.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
            {card.excerpt}
          </p>
        )}
        <p className="mt-3 text-xs text-ink-muted">
          {card.publishedAt && formatDate(card.publishedAt, locale)}
          {" · "}
          {card.readingTime} {minRead}
        </p>
      </div>
    </Link>
  );
}

export function ArticleListing({
  kicker,
  title,
  description,
  cards,
  page,
  totalPages,
  basePath,
  locale,
  minRead,
  emptyText,
}: {
  kicker: string;
  title: string;
  description?: string | null;
  cards: ArticleCard[];
  page: number;
  totalPages: number;
  basePath: string; // e.g. `/en/category/politics`
  locale: AppLocale;
  minRead: string;
  emptyText: string;
}) {
  const [lead, ...rest] = cards;

  return (
    <div className="py-6">
      {/* Header */}
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sage">
          {kicker}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
      </header>

      {cards.length === 0 ? (
        <p className="mt-16 text-center text-ink-muted">{emptyText}</p>
      ) : (
        <div className="mt-12 space-y-14">
          {/* Lead */}
          <LeadCard card={lead} locale={locale} minRead={minRead} />

          {/* Grid */}
          {rest.length > 0 && (
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((c) => (
                <GridCard
                  key={c.id}
                  card={c}
                  locale={locale}
                  minRead={minRead}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="flex items-center justify-center gap-3 pt-4"
              aria-label="Pagination"
            >
              <PageLink
                href={`${basePath}?page=${page - 1}`}
                disabled={page <= 1}
                label="Previous"
              >
                <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
              </PageLink>
              <span className="text-sm text-ink-muted">
                {page} / {totalPages}
              </span>
              <PageLink
                href={`${basePath}?page=${page + 1}`}
                disabled={page >= totalPages}
                label="Next"
              >
                <ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
              </PageLink>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink-muted opacity-40"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink shadow-soft transition hover:bg-wood"
    >
      {children}
    </Link>
  );
}
