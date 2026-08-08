import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import {
  requireRole as requireRoleUnion,
  type SessionUser,
} from "@/lib/auth";

/**
 * For SERVER ACTIONS: returns the user or throws. Throwing in an
 * action surfaces as an error to the caller (and won't silently
 * proceed). We throw rather than redirect because actions may be
 * invoked outside a navigation context.
 */
export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const guard = await requireRoleUnion(allowed);
  if (!guard.ok) {
    throw new Error("Unauthorized");
  }
  return guard.user;
}

/**
 * For PAGES: returns the user or redirects to /login. Redirect is the
 * right UX for a page render (no ugly error screen).
 *
 * We can't easily know the locale here, so we redirect to the
 * unprefixed /login, which your middleware will resolve to the
 * default locale. If you want locale-aware redirects, pass the locale
 * and build the path with localeHref at the call site instead.
 */
export async function requireRolePage(allowed: Role[]): Promise<SessionUser> {
  const guard = await requireRoleUnion(allowed);
  if (!guard.ok) {
    redirect("/login");
  }
  return guard.user;
}

/** Any signed-in user; redirects if not. */
export async function requireUser(): Promise<SessionUser> {
  return requireRolePage([Role.ADMIN, Role.EDITOR, Role.AUTHOR, Role.READER]);
}
