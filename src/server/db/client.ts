import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// Node.js (unlike Edge/browser) has no built-in WebSocket in every
// runtime Vercel might schedule us on, so pin one explicitly rather
// than depend on which Node version is running.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// PrismaNeon (v7 adapter API) takes a neon.PoolConfig and builds its
// own Pool internally — don't construct a Pool by hand and pass it
// in, that was the pre-v7 shape.
const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // Trim logging in prod; query logging adds overhead.
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}