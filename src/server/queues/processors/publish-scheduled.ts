import { type Job } from "bullmq";
import { ArticleStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
 
export async function publishScheduledProcessor(job: Job): Promise<void> {
  const due = await prisma.article.findMany({
    where: {
      status: ArticleStatus.SCHEDULED,
      scheduledFor: { lte: new Date() },
    },
    include: {
      translations: { select: { locale: true, slug: true } },
      category: { include: { translations: { select: { locale: true, slug: true } } } },
    },
  });
 
  if (due.length === 0) return;
 
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
 
    console.log(`[publish-scheduled] published article ${article.id}`);
  }
 
  await requestRevalidation([...paths]);
  console.log(
    `[publish-scheduled] published ${due.length} article(s), revalidated ${paths.size} path(s) (job ${job.id})`,
  );
}
 
/**
 * Best-effort revalidation. Deliberately does NOT throw: the status
 * flips above are already committed, and a BullMQ retry of this job
 * would find zero SCHEDULED rows — so failing the job can't redo the
 * revalidation anyway. Stale pages self-heal at the ISR TTL; we log
 * loudly so a persistent failure is visible.
 */
async function requestRevalidation(paths: string[]): Promise<void> {
  const siteUrl = process.env.SITE_URL; // e.g. http://localhost:3000
  const secret = process.env.REVALIDATE_SECRET;
  if (!siteUrl || !secret) {
    console.error(
      "[publish-scheduled] SITE_URL / REVALIDATE_SECRET missing — skipping ISR revalidation",
    );
    return;
  }
 
  try {
    const res = await fetch(`${siteUrl.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ paths }),
    });
    if (!res.ok) {
      console.error(
        `[publish-scheduled] revalidation failed: HTTP ${res.status} ${await res.text()}`,
      );
    }
  } catch (err) {
    console.error("[publish-scheduled] revalidation request errored:", err);
  }
}