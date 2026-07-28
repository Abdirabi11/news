import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { type Locale } from "@prisma/client";
import { fetchTrendingCards } from "@/server/services/article-cards";
import { type AppLocale } from "@/i18n";

interface TrendingSidebarProps {
  locale: AppLocale;
  title: string; // dict.home.mostRead
  limit?: number;
}

export async function TrendingSidebar({
  locale,
  title,
  limit = 5,
}: TrendingSidebarProps) {
  const cards = await fetchTrendingCards(locale as Locale, limit);
  if (cards.length === 0) return null;

  return (
    <section
      aria-label={title}
      className="rounded-xl border border-zinc-200 bg-zinc-50 p-5"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-900">
        <TrendingUp className="h-4 w-4 text-indigo-700" aria-hidden />
        {title}
      </h2>

      <ol className="mt-4 space-y-4">
        {cards.map((card, i) => (
          <li key={card.id} className="flex gap-3">
            {/* Rank numeral — the visual anchor of the module */}
            <span
              aria-hidden
              className="w-6 shrink-0 text-2xl font-bold leading-none text-zinc-300 tabular-nums"
            >
              {i + 1}
            </span>
            <Link
              href={`/${locale}/article/${card.slug}`}
              className="min-w-0 text-sm font-medium leading-snug text-zinc-800 hover:text-indigo-800"
            >
              <span className="line-clamp-3">{card.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
