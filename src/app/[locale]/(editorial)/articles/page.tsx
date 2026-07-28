import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma, Role, ArticleStatus, Locale } from "@prisma/client";
import { Plus, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/client";

const PAGE_SIZE = 15;
const LOCALES: Locale[] = [Locale.en, Locale.so, Locale.ar];

const STATUS_STYLE: Record<ArticleStatus, { label: string; classes: string }> = {
  DRAFT: { label: "Draft", classes: "bg-zinc-100 text-zinc-600 ring-zinc-200" },
  IN_REVIEW: { label: "In review", classes: "bg-amber-50 text-amber-700 ring-amber-200" },
  SCHEDULED: { label: "Scheduled", classes: "bg-sky-50 text-sky-700 ring-sky-200" },
  PUBLISHED: { label: "Published", classes: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  ARCHIVED: { label: "Archived", classes: "bg-zinc-100 text-zinc-400 ring-zinc-200" },
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: ArticleStatus.DRAFT, label: "Drafts" },
  { value: ArticleStatus.IN_REVIEW, label: "In review" },
  { value: ArticleStatus.SCHEDULED, label: "Scheduled" },
  { value: ArticleStatus.PUBLISHED, label: "Published" },
  { value: ArticleStatus.ARCHIVED, label: "Archived" },
];

function StatusBadge({ status }: { status: ArticleStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.classes}`}
    >
      {s.label}
    </span>
  );
}

/** Signature device: trilingual coverage chips. */
function LocaleChips({ present }: { present: Set<Locale> }) {
  return (
    <span className="inline-flex gap-1" aria-label="Translation coverage">
      {LOCALES.map((l) =>
        present.has(l) ? (
          <span
            key={l}
            title={`${l} translation exists`}
            className="inline-flex h-5 w-7 items-center justify-center rounded bg-indigo-700 text-[10px] font-semibold uppercase text-white"
          >
            {l}
          </span>
        ) : (
          <span
            key={l}
            title={`${l} translation missing`}
            className="inline-flex h-5 w-7 items-center justify-center rounded border border-dashed border-zinc-300 text-[10px] font-semibold uppercase text-zinc-300"
          >
            {l}
          </span>
        ),
      )}
    </span>
  );
}

export default async function ArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`); // layout guards; belt & braces

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const statusFilter = STATUS_FILTERS.some((f) => f.value === sp.status)
    ? sp.status
    : "all";

  const where: Prisma.ArticleWhereInput = {
    ...(statusFilter !== "all" && { status: statusFilter as ArticleStatus }),
    // Authors see only their own work — mirrors the API's rules.
    ...(session.user.role === Role.AUTHOR && { authorId: session.user.id }),
  };

  const [articles, total] = await prisma.$transaction([
    prisma.article.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        author: { select: { name: true } },
        translations: { select: { locale: true, title: true } },
      },
    }),
    prisma.article.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const preferredLocale = (LOCALES as string[]).includes(locale)
    ? (locale as Locale)
    : Locale.en;

  /** Row title: current UI locale -> en -> first available. */
  const rowTitle = (t: { locale: Locale; title: string }[]) =>
    t.find((x) => x.locale === preferredLocale)?.title ??
    t.find((x) => x.locale === Locale.en)?.title ??
    t[0]?.title ??
    "(untitled)";

  const filterHref = (status: string) =>
    `/${locale}/articles${status === "all" ? "" : `?status=${status}`}`;
  const pageHref = (p: number) =>
    `/${locale}/articles?${new URLSearchParams({
      ...(statusFilter !== "all" && { status: statusFilter! }),
      page: String(p),
    })}`;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Articles</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} article{total === 1 ? "" : "s"}
            {session.user.role === Role.AUTHOR && " · your work"}
          </p>
        </div>
        <Link
          href={`/${locale}/articles/new`}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New article
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="mt-6 flex gap-1 border-b border-zinc-200">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={filterHref(f.value)}
            aria-current={statusFilter === f.value ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? "border-indigo-700 text-indigo-700"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {articles.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <FileText className="h-8 w-8 text-zinc-300" aria-hidden />
          <p className="text-sm font-medium text-zinc-600">
            No articles here yet
          </p>
          <p className="max-w-xs text-sm text-zinc-400">
            {statusFilter === "all"
              ? "Create your first article to get started."
              : "Nothing matches this status. Try another tab."}
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-start text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 text-start font-medium">Title</th>
                <th className="px-4 py-3 text-start font-medium">Author</th>
                <th className="px-4 py-3 text-start font-medium">Status</th>
                <th className="px-4 py-3 text-start font-medium">
                  Translations
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {articles.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-zinc-50">
                  <td className="max-w-md px-4 py-3">
                    <Link
                      href={`/${locale}/articles/${a.id}`}
                      className="block truncate font-medium text-zinc-900 hover:text-indigo-700"
                    >
                      {rowTitle(a.translations)}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Updated{" "}
                      {a.updatedAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {a.author.name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <LocaleChips
                      present={new Set(a.translations.map((t) => t.locale))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="mt-4 flex items-center justify-between text-sm"
          aria-label="Pagination"
        >
          <p className="text-zinc-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Next
                <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}