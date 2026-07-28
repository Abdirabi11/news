import { type Job } from "bullmq";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { redis, redisKeys } from "@/server/redis/client";
import { parseViewField } from "@/server/services/views";
 
const STAGING_KEY = `${redisKeys.pendingViews()}:flushing`;
 
export async function flushViewsProcessor(job: Job): Promise<void> {
  // 1. Drain leftovers from a previously crashed run (usually a no-op).
  await drainStaging(job);
 
  // 2. Rotate pending -> staging. RENAME is atomic; throws if the
  //    source key doesn't exist (i.e., zero views since last flush).
  try {
    await redis.rename(redisKeys.pendingViews(), STAGING_KEY);
  } catch {
    return; // nothing to flush
  }
 
  // 3. Drain the freshly rotated staging hash.
  await drainStaging(job);
}
 
async function drainStaging(job: Job): Promise<void> {
  const entries = await redis.hgetall(STAGING_KEY);
  const fields = Object.keys(entries);
  if (fields.length === 0) return;
 
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
        // Unknown DB error: leave the staging key intact and fail the
        // job — BullMQ retries, and the next run re-drains staging.
        throw err;
      }
    }
  }
 
  // 4. All rows handled — discard the staging hash.
  await redis.del(STAGING_KEY);
  console.log(
    `[flush-views] flushed ${flushed} bucket(s), skipped ${skipped} (job ${job.id})`,
  );
}