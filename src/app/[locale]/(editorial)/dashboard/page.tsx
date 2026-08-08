import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  Image as ImageIcon,
  Users,
  Settings,
  PenLine,
  TrendingUp,
  Clock,
  ArrowUpRight,
  CircleDot,
  CheckCircle2,
  CalendarClock,
  FileEdit,
} from "lucide-react";
import { ArticleStatus, Locale } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/server/db/client";
import {
  getDictionary,
  formatDate,
  localeHref,
  isAppLocale,
  type AppLocale,
} from "@/i18n";
// FIX: Consolidated imports so notFound is only defined once!
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

// Editorial dashboards must always reflect current data.
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  const appLocale = locale as AppLocale;
  const dbLocale = appLocale as Locale;

  const guard = await requireUser();
  if (!guard.ok) redirect(localeHref(appLocale, "/login"));
  
  const user = guard.user as { id: string; name?: string | null; role?: string };
  const dict = await getDictionary(appLocale);

  // ---- Data ---------------------------------------------------------
  const [
    totalArticles,
    totalMedia,
    totalUsers,
    publishedCount,
    draftCount,
    scheduledCount,
    reviewCount,
    recentArticles,
    recentDrafts,
  ] = await Promise.all([
    prisma.article.count(),
    prisma.media.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.article.count({ where: { status: ArticleStatus.PUBLISHED } }),
    prisma.article.count({ where: { status: ArticleStatus.DRAFT } }),
    prisma.article.count({ where: { status: ArticleStatus.SCHEDULED } }),
    prisma.article.count({ where: { status: ArticleStatus.IN_REVIEW } }),
    prisma.article.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: {
        id: true,
        publishedAt: true,
        viewCount: true,
        author: { select: { name: true } },
        translations: {
          where: { locale: dbLocale },
          select: { title: true, slug: true },
          take: 1,
        },
        _count: { select: { translations: true } },
      },
    }),
    prisma.article.findMany({
      where: {
        status: { in: [ArticleStatus.DRAFT, ArticleStatus.IN_REVIEW] },
        authorId: user.id,
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        status: true,
        updatedAt: true,
        translations: {
          where: { locale: dbLocale },
          select: { title: true },
          take: 1,
        },
      },
    }),
  ]);

  const firstName = user.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // ---- Presentational config ---------------------------------------
  const stats = [
    {
      label: "Articles",
      value: totalArticles,
      icon: FileText,
      href: localeHref(appLocale, "/articles"),
      tint: "bg-sage-soft text-sage",
    },
    {
      label: "Media",
      value: totalMedia,
      icon: ImageIcon,
      href: localeHref(appLocale, "/media"),
      tint: "bg-amber-soft text-amber",
    },
    {
      label: "Published",
      value: publishedCount,
      icon: CheckCircle2,
      href: localeHref(appLocale, "/articles?status=published"),
      tint: "bg-sage-soft text-sage",
    },
    {
      label: "Team",
      value: totalUsers,
      icon: Users,
      href: localeHref(appLocale, "/team"),
      tint: "bg-terracotta-soft text-terracotta",
    },
  ];

  const pipeline = [
    { label: "Published", value: publishedCount, icon: CheckCircle2, tint: "text-sage" },
    { label: "In review", value: reviewCount, icon: CircleDot, tint: "text-amber" },
    { label: "Scheduled", value: scheduledCount, icon: CalendarClock, tint: "text-terracotta" },
    { label: "Drafts", value: draftCount, icon: FileEdit, tint: "text-ink-muted" },
  ];

  const quickActions = [
    { label: "New article", icon: PenLine, href: localeHref(appLocale, "/articles/new") },
    { label: "Media library", icon: ImageIcon, href: localeHref(appLocale, "/media") },
    { label: "Team", icon: Users, href: localeHref(appLocale, "/team") },
    { label: "Settings", icon: Settings, href: localeHref(appLocale, "/settings") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sage">
          {(dict.nav as Record<string, string | undefined>)?.dashboard ?? "Dashboard"}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {greeting}, {firstName}
        </h1>
        <p className="mt-2 text-ink-soft">
          Here&apos;s what&apos;s happening across the newsroom today.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group flex flex-col justify-between rounded-3xl bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${s.tint}`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <ArrowUpRight
                  className="h-4 w-4 text-ink-muted opacity-0 transition group-hover:opacity-100 rtl:-scale-x-100"
                  aria-hidden
                />
              </div>
              <div className="mt-6">
                <p className="font-sans text-3xl font-bold tabular-nums text-ink">
                  {s.value.toLocaleString()}
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">{s.label}</p>
              </div>
            </Link>
          );
        })}

        <section className="col-span-2 rounded-3xl bg-surface p-6 shadow-soft lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-ink">
              <TrendingUp className="h-5 w-5 text-sage" aria-hidden />
              Recently published
            </h2>
            <Link
              href={localeHref(appLocale, "/articles")}
              className="text-sm font-medium text-sage transition hover:text-sage-hover"
            >
              View all
            </Link>
          </div>

          {recentArticles.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">
              No published articles yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {recentArticles.map((a) => {
                const title = a.translations[0]?.title ?? "(untitled)";
                const slug = a.translations[0]?.slug;
                const row = (
                  <div className="flex items-center gap-4 rounded-2xl px-3 py-3 transition group-hover:bg-canvas">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-sage">
                      <FileText className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {a.author.name}
                        {a.publishedAt && (
                          <>
                            {" · "}
                            {formatDate(a.publishedAt, appLocale)}
                          </>
                        )}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-ink-muted">
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                      {a.viewCount.toLocaleString()}
                    </span>
                  </div>
                );
                return (
                  <li key={a.id}>
                    {slug ? (
                      <Link
                        href={localeHref(appLocale, `/article/${slug}`)}
                        className="group block"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="group">{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="col-span-2 rounded-3xl bg-wood p-6 shadow-soft lg:col-span-1">
          <h2 className="mb-5 font-serif text-xl font-bold text-ink">
            Pipeline
          </h2>
          <ul className="space-y-4">
            {pipeline.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.label} className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${p.tint}`} aria-hidden />
                  <span className="flex-1 text-sm text-ink-soft">{p.label}</span>
                  <span className="font-sans text-lg font-bold tabular-nums text-ink">
                    {p.value}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="col-span-2 rounded-3xl bg-surface p-6 shadow-soft">
          <h2 className="mb-5 font-serif text-xl font-bold text-ink">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.label}
                  href={q.href}
                  className="group flex items-center gap-3 rounded-2xl bg-canvas p-4 transition hover:bg-wood"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-sage shadow-soft">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {q.label}
                  </span>
                  <ArrowUpRight
                    className="ms-auto h-4 w-4 text-ink-muted opacity-0 transition group-hover:opacity-100 rtl:-scale-x-100"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="col-span-2 rounded-3xl bg-surface p-6 shadow-soft">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-ink">
              <Clock className="h-5 w-5 text-amber" aria-hidden />
              Your drafts
            </h2>
            <Link
              href={localeHref(appLocale, "/articles?status=draft")}
              className="text-sm font-medium text-sage transition hover:text-sage-hover"
            >
              View all
            </Link>
          </div>

          {recentDrafts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canvas text-ink-muted">
                <PenLine className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-sm text-ink-muted">
                No drafts in progress — start something new.
              </p>
              <Link
                href={localeHref(appLocale, "/articles/new")}
                className="inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-hover"
              >
                <PenLine className="h-4 w-4" aria-hidden />
                New article
              </Link>
            </div>
          ) : (
            <ul className="space-y-1">
              {recentDrafts.map((d) => {
                const title = d.translations[0]?.title ?? "(untitled draft)";
                return (
                  <li key={d.id}>
                    <Link
                      href={localeHref(appLocale, `/articles/${d.id}`)}
                      className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-canvas"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-soft text-amber">
                        <FileEdit className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {title}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {d.status === ArticleStatus.IN_REVIEW
                            ? "In review"
                            : "Draft"}
                          {" · updated "}
                          {formatDate(d.updatedAt, appLocale)}
                        </p>
                      </div>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-ink-muted opacity-0 transition group-hover:opacity-100 rtl:-scale-x-100"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}