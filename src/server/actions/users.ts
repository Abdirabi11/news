"use server";

/**
 * User management server actions (Admin-only).
 *
 * Every action re-checks requireRole([Role.ADMIN]) — never trust that
 * the UI hid a button. Guards enforced here, not in the client.
 *
 * Safety invariants (these prevent locking everyone out):
 *   - You cannot delete your own account.
 *   - You cannot delete or demote the LAST remaining active admin.
 *   - Role/status changes that would remove the final admin are refused.
 *
 * On success each action revalidates the users list. Because the app
 * uses prefix-except-default routing, we revalidate by PATH for the
 * canonical (unprefixed) editorial route; adjust if your editorial
 * group is served under a locale prefix in your setup.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { requireRole } from "@/lib/auth-guards";
// FIX: Imported AppLocale type
import { localeHref, isAppLocale, DEFAULT_LOCALE, type AppLocale } from "@/i18n";

export interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const roleEnum = z.nativeEnum(Role);

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: roleEnum,
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  isActive: z.boolean().default(true),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: roleEnum,
  isActive: z.boolean(),
  // Optional: only rehash if a new password was supplied.
  password: z
    .union([z.string().min(8, "Password must be at least 8 characters").max(200), z.literal("")])
    .optional(),
});

/** Count active admins other than an optionally-excluded id. */
async function otherActiveAdminCount(excludeId?: string): Promise<number> {
  return prisma.user.count({
    where: {
      role: Role.ADMIN,
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

// FIX: Explicitly return AppLocale instead of string
function coerceLocale(raw: FormDataEntryValue | null): AppLocale {
  const v = typeof raw === "string" ? raw : DEFAULT_LOCALE;
  return isAppLocale(v) ? (v as AppLocale) : (DEFAULT_LOCALE as AppLocale);
}

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole([Role.ADMIN]);
  const locale = coerceLocale(formData.get("locale"));

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { ok: false, fieldErrors: { email: ["That email is already in use"] } };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      isActive: data.isActive,
      passwordHash,
      emailVerified: new Date(),
    },
  });

  revalidatePath("/users");
  redirect(localeHref(locale, "/users"));
}

export async function updateUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const locale = coerceLocale(formData.get("locale"));

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    password: formData.get("password") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: data.id } });
  if (!target) return { ok: false, error: "User not found" };

  // Guard: don't let the last active admin be demoted or deactivated.
  const wouldLoseAdmin =
    target.role === Role.ADMIN &&
    target.isActive &&
    (data.role !== Role.ADMIN || !data.isActive);
  if (wouldLoseAdmin && (await otherActiveAdminCount(target.id)) === 0) {
    return {
      ok: false,
      error: "You can't remove the last active admin. Promote another admin first.",
    };
  }

  // Email uniqueness (if changed).
  if (data.email !== target.email) {
    const clash = await prisma.user.findUnique({ where: { email: data.email } });
    if (clash) return { ok: false, fieldErrors: { email: ["That email is already in use"] } };
  }

  await prisma.user.update({
    where: { id: data.id },
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      isActive: data.isActive,
      ...(data.password
        ? { passwordHash: await bcrypt.hash(data.password, 12) }
        : {}),
    },
  });

  revalidatePath("/users");
  redirect(localeHref(locale, "/users"));
}

export async function deleteUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Missing user id" };
  }

  // Guard: never delete yourself (prevents accidental lockout).
  if (id === admin.id) {
    return { ok: false, error: "You can't delete your own account." };
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { ok: false, error: "User not found" };

  // Guard: never delete the last active admin.
  if (
    target.role === Role.ADMIN &&
    target.isActive &&
    (await otherActiveAdminCount(target.id)) === 0
  ) {
    return { ok: false, error: "You can't delete the last active admin." };
  }

  // Prefer deactivation over hard delete if the user authored articles,
  // to avoid orphaning content via required author relations. Hard
  // delete only when they have no articles.
  const articleCount = await prisma.article.count({ where: { authorId: id } });
  if (articleCount > 0) {
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/users");
    return {
      ok: true,
      error:
        "User has authored articles, so they were deactivated rather than deleted.",
    };
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/users");
  return { ok: true };
}