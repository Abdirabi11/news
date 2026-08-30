import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { redis, redisKeys } from "@/server/redis/client";
import { parseViewField } from "@/server/services/views";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STAGING_KEY = `${redisKeys.pendingViews()}:flushing`;

/**
 * QStash Schedule invokes this hourly (see setup instructions).
 * Replaces the old BullMQ `flush-views` worker: same
 * rotate-then-drain logic, just triggered by a signed webhook
 * instead of a queue job. `verifySignatureAppRouter` checks the
 * `Upstash-Signature` header against QSTASH_CURRENT_SIGNING_KEY /
 * QSTASH_NEXT_SIGNING_KEY and rejects anything unsigned.
 */
export const POST = verifySignatureAppRouter(async () => {
  try {
    // Drain any leftovers from a run that crashed mid-flush.
    await drainStaging();

    // Rotate pending -> staging. RENAME is atomic; throws if the
    // source key doesn't exist (i.e., zero views since last run).
    try {
      await redis.rename(redisKeys.pendingViews(), STAGING_KEY);
    } catch {
      return NextResponse.json({ flushed: 0, skipped: 0, note: "nothing pending" });
    }

    const result = await drainStaging();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron/sync-views] failed:", err);
    return new NextResponse("Internal error", { status: 500 });
  }
});

async function drainStaging(): Promise<{ flushed: number; skipped: number }> {
  const entries = await redis.hgetall(STAGING_KEY);
  const fields = Object.keys(entries);
  if (fields.length === 0) return { flushed: 0, skipped: 0 };

  let flushed = 0;
  let skipped = 0;

  for (const field of fields) {
    const parsed = parseViewField(field);
    const count = Number.parseInt(entries[field], 10);
    if (!parsed || !Number.isFinite(count) || count <= 0) {
      skipped++;
      continue;
    }

    try {
      await prisma.$transaction([
        prisma.articleDailyStat.upsert({
          where: {
            articleId_date: {
              articleId: parsed.articleId,
              date: new Date(parsed.date),
            },
          },
          create: {
            articleId: parsed.articleId,
            date: new Date(parsed.date),
            views: count,
          },
          update: { views: { increment: count } },
        }),
        prisma.article.update({
          where: { id: parsed.articleId },
          data: { viewCount: { increment: count } },
        }),
      ]);
      flushed++;
    } catch (err) {
      // Article deleted between view and flush — drop its counts.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        (err.code === "P2025" || err.code === "P2003")
      ) {
        skipped++;
      } else {
        // Unknown DB error: leave staging intact and bail — the
        // NEXT cron tick re-drains it. No BullMQ retry to lean on
        // anymore, so this key IS the retry mechanism now.
        throw err;
      }
    }
  }

  await redis.del(STAGING_KEY);
  console.log(`[cron/sync-views] flushed ${flushed}, skipped ${skipped}`);
  return { flushed, skipped };
}
