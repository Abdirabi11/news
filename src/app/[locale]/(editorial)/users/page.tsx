/**
 * /[locale]/users — admin user management.
 *
 * A readable, high-contrast data table (Name / Email / Role / Status)
 * with a Create button and per-row Edit + Delete. All styling uses
 * creamy-wood tokens (bg-surface/bg-canvas/text-ink) so contrast holds
 * in both light and dark — no more black-box-with-faint-text.
 *
 * Admin-only. Delete is a client island (confirm + pending); the row
 * highlights the signed-in admin so they can see it's them.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { UserCog, Plus, Pencil, ShieldCheck, Mail } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { requireRolePage } from "@/lib/auth-guards";
import { getDictionary, isAppLocale, localeHref, type AppLocale } from "@/i18n";
import { EmptyState } from "@/components/admin/empty-state";
import { DeleteUserButton } from "@/components/users/delete-user-button";

export const dynamic = "force-dynamic";

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: "bg-terracotta-soft text-terracotta",
  EDITOR: "bg-sage-soft text-sage",
  AUTHOR: "bg-amber-soft text-amber",
  READER: "bg-canvas text-ink-muted",
};

function RoleBadge({ role }: { role: Role }) {
  const label = role.charAt(0) + role.slice(1).toLowerCase();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_STYLES[role]}`}
    >
      {role === Role.ADMIN && <ShieldCheck className="h-3 w-3" aria-hidden />}
      {label}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        active ? "text-sage" : "text-ink-muted"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-sage" : "bg-ink-muted"
        }`}
        aria-hidden
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  const appLocale = locale as AppLocale;

  const admin = await requireRolePage([Role.ADMIN]);
  const dict = await getDictionary(appLocale);

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      _count: { select: { articles: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          {/* FIX: Safely cast the dictionary object here */}
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sage">
            {(dict.nav as Record<string, string | undefined>)?.admin ?? "Admin"}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink">
            Team &amp; users
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Manage who can write, edit, and publish.
          </p>
        </div>
        <Link
          href={localeHref(appLocale, "/users/new")}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Create user
        </Link>
      </header>

      {users.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No users found"
          description="This shouldn't usually happen — at least one admin should exist. Create a user to continue."
          actionLabel="Create user"
          actionHref={localeHref(appLocale, "/users/new")}
        />
      ) : (
        <div className="overflow-hidden rounded-3xl bg-surface shadow-soft">
          {/* Header row (hidden on small screens) */}
          <div className="hidden grid-cols-[2fr_1fr_1fr_auto] gap-4 bg-canvas px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted sm:grid">
            <span>Name</span>
            <span>Role</span>
            <span>Status</span>
            <span className="text-end">Actions</span>
          </div>

          <ul>
            {users.map((u, i) => {
              const isSelf = u.id === admin.id;
              return (
                <li
                  key={u.id}
                  className={`grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-center sm:gap-4 ${
                    i > 0 ? "border-t border-hair" : ""
                  } ${isSelf ? "bg-sage-soft/40" : ""}`}
                >
                  {/* Name + email */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">
                        {u.name ?? "(no name)"}
                      </p>
                      {isSelf && (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                          You
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                      <Mail className="h-3 w-3" aria-hidden />
                      <span className="truncate">{u.email}</span>
                    </p>
                  </div>

                  {/* Role */}
                  <div>
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-ink-muted sm:hidden">
                      Role
                    </span>
                    <RoleBadge role={u.role} />
                  </div>

                  {/* Status */}
                  <div>
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-ink-muted sm:hidden">
                      Status
                    </span>
                    <StatusBadge active={u.isActive} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-start gap-2 sm:justify-end">
                    <Link
                      href={localeHref(appLocale, `/users/${u.id}`)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-wood"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Edit
                    </Link>
                    {/* Don't render delete for self — server also blocks it. */}
                    {!isSelf && (
                      <DeleteUserButton userId={u.id} locale={appLocale} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}