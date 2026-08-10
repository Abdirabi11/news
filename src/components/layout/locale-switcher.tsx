"use client";

/**
 * LocaleSwitcher — the language pills in the public header.
 *
 * Each pill links through /api/locale-switch with the CURRENT path,
 * so the server can map slugs to their sibling translations —
 * reading /en/article/somalia-launches-… and tapping AR lands on
 * /ar/article/alsumal-tutliq-… , not the Arabic homepage.
 *
 * Client Component because it needs usePathname/useSearchParams.
 * useSearchParams requires a <Suspense> boundary in the tree when
 * rendered inside statically-generated pages — mount it as:
 *
 *   <Suspense fallback={null}>
 *     <LocaleSwitcher current={appLocale} />
 *   </Suspense>
 */
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LOCALES, LOCALE_NAMES, type AppLocale } from "@/i18n";

export function LocaleSwitcher({ current }: { current: AppLocale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.toString();
  const fullPath = `${pathname}${query ? `?${query}` : ""}`;

  return (
    <nav aria-label="Languages" className="flex gap-0.5">
      {LOCALES.map((l) =>
        l === current ? (
          <span
            key={l}
            aria-current="true"
            title={LOCALE_NAMES[l]}
            className="rounded bg-accent px-2 py-1 text-xs font-semibold uppercase text-white"
          >
            {l}
          </span>
        ) : (
          <Link
            key={l}
            prefetch={false}
            href={`/api/locale-switch?to=${l}&path=${encodeURIComponent(fullPath)}`}
            title={LOCALE_NAMES[l]}
            className="rounded px-2 py-1 text-xs font-semibold uppercase text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            {l}
          </Link>
        ),
      )}
    </nav>
  );
}
