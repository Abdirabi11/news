/**
 * /[locale]/users/[id] — edit a user (Admin only).
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { requireRolePage } from "@/lib/auth-guards";
import { isAppLocale, localeHref, type AppLocale } from "@/i18n";
import { UserForm } from "@/components/users/user-form";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isAppLocale(locale)) notFound();
  const appLocale = locale as AppLocale;

  await requireRolePage([Role.ADMIN]);

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href={localeHref(appLocale, "/users")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
        Back to users
      </Link>

      <h1 className="mb-6 font-serif text-3xl font-bold tracking-tight text-ink">
        Edit user
      </h1>

      <UserForm mode="edit" locale={appLocale} user={user} />
    </div>
  );
}
