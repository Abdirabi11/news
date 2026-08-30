import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { rateLimit } from "@/server/redis/rate-limit";
import { redisKeys } from "@/server/redis/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/** Thrown when the login rate limit is hit; surfaces as ?code=too_many_attempts. */
class TooManyAttemptsError extends CredentialsSignin {
  code = "too_many_attempts";
}
 
export const { handlers, auth, signIn, signOut } = NextAuth({
  // FIX: Explicitly tell Auth.js to trust Vercel's proxy host
  trustHost: true,

  // No adapter: Credentials-only auth with JWT sessions doesn't touch
  // the Account/Session/VerificationToken tables an adapter manages —
  // the User row itself is read/written directly in authorize() below.
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes
    updateAge: 5 * 60, // 5 minutes
  },

  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Fail CLOSED: auth is the one place a Redis blip should
        // block requests rather than let credential-stuffing through
        // unlimited (contrast with the fail-open view-counter).
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        const limit = await rateLimit({
          key: redisKeys.rateLimit("login", ip),
          limit: 10,
          windowMs: 5 * 60_000,
          failOpen: false,
        });
        if (!limit.success) throw new TooManyAttemptsError();

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
          // FIX: explicitly cast token.id as a string for Prisma
          where: { id: token.id as string },
          select: { role: true, isActive: true },
        });
        if (fresh) token.role = fresh.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
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
 
  if (!allowed.includes(session.user.role as Role)) {
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
      role: session.user.role as Role,
      email: session.user.email,
      name: session.user.name,
    },
  };
}


 
/** Convenience wrapper: any signed-in user (Reader and up). */
export const requireUser = () =>
  requireRole([Role.ADMIN, Role.EDITOR, Role.AUTHOR, Role.READER]);