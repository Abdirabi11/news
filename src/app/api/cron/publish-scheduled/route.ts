import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { revalidatePath } from "next/cache";
import { ArticleStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * QStash Schedule invokes this every 15 minutes (see setup
 * instructions). Replaces the old BullMQ `publish-scheduled` worker.
 * Runs in-process now, so revalidation is a direct
 * `revalidatePath()` call instead of an HTTP round-trip.
 */
export const POST = verifySignatureAppRouter(async () => {
  const due = await prisma.article.findMany({
    where: {
      status: ArticleStatus.SCHEDULED,
      scheduledFor: { lte: new Date() },
    },
    include: {
      translations: { select: { locale: true, slug: true } },
      category: {
        include: { translations: { select: { locale: true, slug: true } } },
      },
    },
  });

  if (due.length === 0) {
    return NextResponse.json({ published: 0 });
  }

  const paths = new Set<string>();

  for (const article of due) {
    await prisma.article.update({
      where: { id: article.id },
      data: {
        status: ArticleStatus.PUBLISHED,
        // Preserve an existing timestamp (re-scheduled republish).
        publishedAt: article.publishedAt ?? new Date(),
        scheduledFor: null,
      },
    });

    for (const t of article.translations) {
      paths.add(`/${t.locale}`); // locale homepage
      paths.add(`/${t.locale}/article/${t.slug}`);
      const cat = article.category?.translations.find(
        (c) => c.locale === t.locale,
      );
      if (cat) paths.add(`/${t.locale}/category/${cat.slug}`);
    }

    console.log(`[cron/publish-scheduled] published article ${article.id}`);
  }

  for (const path of paths) revalidatePath(path);

  console.log(
    `[cron/publish-scheduled] published ${due.length} article(s), revalidated ${paths.size} path(s)`,
  );
  return NextResponse.json({ published: due.length, revalidated: paths.size });
});
