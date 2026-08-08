import { notFound } from "next/navigation";
import Link from "next/link";
import { FolderTree, Plus, Hash } from "lucide-react";
import { Locale } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { requireRolePage } from "@/lib/auth-guards";
import { Role } from "@prisma/client";
import { getDictionary, isAppLocale, localeHref, type AppLocale } from "@/i18n";
import { EmptyState } from "@/components/admin/empty-state";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  const appLocale = locale as AppLocale;
  const dbLocale = appLocale as Locale;

  await requireRolePage([Role.ADMIN, Role.EDITOR]);
  const dict = await getDictionary(appLocale);

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      sortOrder: true,
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
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sage">
            {(dict.nav as Record<string, string | undefined>)?.admin ?? "Admin"}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink">
            Categories
          </h1>
        </div>
        <Link
          href={localeHref(appLocale, "/categories/new")}
          className="inline-flex items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New category
        </Link>
      </header>

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="Categories organise your coverage into sections like Politics, Technology, and Local News. Create your first one to get started."
          actionLabel="Create a category"
          actionHref={localeHref(appLocale, "/categories/new")}
        />
      ) : (
        <div className="overflow-hidden rounded-3xl bg-surface shadow-soft">
          <ul>
            {categories.map((c, i) => {
              const name = c.translations[0]?.name ?? "(untranslated)";
              const slug = c.translations[0]?.slug;
              return (
                <li key={c.id}>
                  <Link
                    href={localeHref(appLocale, `/categories/${c.id}`)}
                    className={`flex items-center gap-4 px-6 py-4 transition hover:bg-canvas ${
                      i > 0 ? "border-t border-hair" : ""
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-soft text-sage">
                      <FolderTree className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{name}</p>
                      {slug && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                          <Hash className="h-3 w-3" aria-hidden />
                          {slug}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-ink-muted">
                      {c._count.articles}{" "}
                      {c._count.articles === 1 ? "article" : "articles"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
