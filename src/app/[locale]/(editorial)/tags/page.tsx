import { notFound } from "next/navigation";
import Link from "next/link";
import { Tags, Plus, Hash } from "lucide-react";
import { Locale, Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { requireRolePage } from "@/lib/auth-guards";
import { getDictionary, isAppLocale, localeHref, type AppLocale } from "@/i18n";
import { EmptyState } from "@/components/admin/empty-state";

export const dynamic = "force-dynamic";

export default async function TagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  const appLocale = locale as AppLocale;
  const dbLocale = appLocale as Locale;

  // FIX 1: Passed appLocale to the auth guard so it knows where to redirect
  await requireRolePage([Role.ADMIN, Role.EDITOR]);
  const dict = await getDictionary(appLocale);

  const tags = await prisma.tag.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      _count: { select: { articles: true } },
      translations: {
        where: { locale: dbLocale },
        select: { name: true, slug: true },
        take: 1,
      },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          {/* FIX 2: Safely cast the dictionary object to avoid TypeScript errors */}
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sage">
            {(dict.nav as Record<string, string | undefined>)?.admin ?? "Admin"}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink">
            Tags
          </h1>
        </div>
        <Link
          href={localeHref(appLocale, "/tags/new")}
          className="inline-flex items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New tag
        </Link>
      </header>

      {tags.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No tags yet"
          description="Tags let readers follow topics across categories. Add tags to articles, and they'll appear here."
          actionLabel="Create a tag"
          actionHref={localeHref(appLocale, "/tags/new")}
        />
      ) : (
        <div className="rounded-3xl bg-surface p-6 shadow-soft">
          <div className="flex flex-wrap gap-3">
            {tags.map((t) => {
              const name = t.translations[0]?.name ?? "(untranslated)";
              return (
                <Link
                  key={t.id}
                  href={localeHref(appLocale, `/tags/${t.id}`)}
                  className="group inline-flex items-center gap-2 rounded-full bg-canvas px-4 py-2 text-sm transition hover:bg-wood"
                >
                  <Hash className="h-3.5 w-3.5 text-sage" aria-hidden />
                  <span className="font-medium text-ink">{name}</span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-muted">
                    {t._count.articles}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}