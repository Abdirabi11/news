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
  password: z.string().min(1),
});
 
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  pages: {
    signIn: "/login", // locale-prefixed at runtime
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
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
      }
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
 
export const requireUser = () =>
  requireRole([Role.ADMIN, Role.EDITOR, Role.AUTHOR, Role.READER]);