import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
 
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
 
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  pages: {
    signIn: "/login", // built in Phase 4 (editorial UI)
  },
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
 
        const { email, password } = parsed.data;
 
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
 
        // Reject OAuth-only accounts (no hash) and deactivated users.
        if (!user?.passwordHash || !user.isActive) return null;
 
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
 
        // Whatever is returned here is passed to the jwt() callback
        // as `user` on initial sign-in.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign-in: copy id + role from the authorize() result.
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      // Optional hardening: re-read the role from the DB when the
      // client calls `update()`, so demotions take effect without
      // waiting for token expiry.
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, isActive: true },
        });
        if (fresh) token.role = fresh.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
 
// ----------------------------------------------------------------
// RBAC guard
// ----------------------------------------------------------------
 
export type SessionUser = {
  id: string;
  role: Role;
  email?: string | null;
  name?: string | null;
};
 
export type GuardResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };
 
/**
 * Route Handler / Server Action guard.
 *
 * Usage:
 *   const guard = await requireRole([Role.ADMIN, Role.EDITOR]);
 *   if (!guard.ok) return guard.response;
 *   // guard.user is now typed and authorized
 *
 * Returns a discriminated union instead of throwing, so handlers
 * stay linear and no try/catch plumbing is needed.
 */
export async function requireRole(allowed: Role[]): Promise<GuardResult> {
  const session = await auth();
 
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }
 
  if (!allowed.includes(session.user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 },
      ),
    };
  }
 
  return {
    ok: true,
    user: {
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
      name: session.user.name,
    },
  };
}
 
/** Convenience wrapper: any signed-in user (Reader and up). */
export const requireUser = () =>
  requireRole([Role.ADMIN, Role.EDITOR, Role.AUTHOR, Role.READER]);
 