import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { ArticleStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { redis, redisKeys } from "@/server/redis/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GRAVITY = 1.8;
const VIEW_WINDOW_HOURS = 48;
const CANDIDATE_WINDOW_DAYS = 7; // only recent articles can trend
const MAX_PER_LOCALE = 50;
const LOCALES = ["en", "so", "ar"] as const;

/**
 * QStash Schedule invokes this every 15 minutes. Replaces the old
 * BullMQ `recalc-trending` worker with identical scoring logic.
 */
export const POST = verifySignatureAppRouter(async () => {
  const now = Date.now();
  const viewsSince = new Date(now - VIEW_WINDOW_HOURS * 3_600_000);
  const publishedSince = new Date(now - CANDIDATE_WINDOW_DAYS * 86_400_000);

  const candidates = await prisma.article.findMany({
    where: {
      status: ArticleStatus.PUBLISHED,
      publishedAt: { gte: publishedSince },
    },
    select: {
      id: true,
      publishedAt: true,
      translations: { select: { locale: true } },
    },
  });

  if (candidates.length === 0) {
    for (const locale of LOCALES) await redis.del(redisKeys.trending(locale));
    return NextResponse.json({ candidates: 0 });
  }

  const stats = await prisma.articleDailyStat.groupBy({
    by: ["articleId"],
    where: {
      articleId: { in: candidates.map((c) => c.id) },
      date: { gte: viewsSince },
    },
    _sum: { views: true },
  });
  const recentViews = new Map(
    stats.map((s) => [s.articleId, s._sum.views ?? 0]),
  );

  const byLocale = new Map<string, { id: string; score: number }[]>();
  for (const article of candidates) {
    const views = recentViews.get(article.id) ?? 0;
    if (views === 0) continue; // no traffic, can't trend

    const ageHours = Math.max(
      0,
      (now - (article.publishedAt?.getTime() ?? now)) / 3_600_000,
    );
    const score = views / Math.pow(ageHours + 2, GRAVITY);

    for (const t of article.translations) {
      const bucket = byLocale.get(t.locale) ?? [];
      bucket.push({ id: article.id, score });
      byLocale.set(t.locale, bucket);
    }
  }

  for (const locale of LOCALES) {
    const liveKey = redisKeys.trending(locale);
    const entries = byLocale.get(locale) ?? [];

    if (entries.length === 0) {
      await redis.del(liveKey);
      continue;
    }

    const tempKey = `${liveKey}:next`;
    const pipeline = redis.pipeline();
    pipeline.del(tempKey);
    for (const e of entries) pipeline.zadd(tempKey, e.score, e.id);
    // Keep only the top MAX_PER_LOCALE (highest scores).
    pipeline.zremrangebyrank(tempKey, 0, -(MAX_PER_LOCALE + 1));
    pipeline.rename(tempKey, liveKey);
    await pipeline.exec();
  }

  console.log(
    `[cron/recalc-trending] scored ${candidates.length} candidate(s) across ${byLocale.size} locale(s)`,
  );
  return NextResponse.json({
    candidates: candidates.length,
    locales: byLocale.size,
  });
});
