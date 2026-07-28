import { type Job, UnrecoverableError } from "bullmq";
import { Resend } from "resend";
import { ArticleStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { type NewsletterJob } from "@/server/queues/config";
 
const BATCH_SIZE = 100; // Resend batch endpoint limit
 
export async function dispatchNewsletterProcessor(
  job: Job<NewsletterJob>,
): Promise<void> {
  const { articleId, locales } = job.data;
 
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { translations: true },
  });
  if (!article) {
    throw new UnrecoverableError(`Article ${articleId} no longer exists`);
  }
  if (article.status !== ArticleStatus.PUBLISHED) {
    // Unpublished between enqueue and dispatch — never email drafts.
    throw new UnrecoverableError(
      `Article ${articleId} is ${article.status}, not PUBLISHED — aborting dispatch`,
    );
  }
 
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  if (!apiKey || !from) {
    console.warn(
      "[newsletter] RESEND_API_KEY / EMAIL_FROM not set — skipping send (dev mode)",
    );
    return;
  }
  const resend = new Resend(apiKey);
 
  // Dispatch per locale the article is translated into.
  const targets = article.translations.filter(
    (t) => !locales || locales.includes(t.locale),
  );
 
  let totalSent = 0;
 
  for (const t of targets) {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { locale: t.locale, isConfirmed: true, unsubscribedAt: null },
      select: { email: true },
    });
    if (subscribers.length === 0) continue;
 
    const articleUrl = `${siteUrl}/${t.locale}/article/${t.slug}`;
    const isRtl = t.locale === "ar";
 
    // Minimal placeholder template; swap for React Email later.
    // TODO: append per-recipient unsubscribe links once the
    // unsubscribe route lands (frontend phase).
    const html = `
      <div dir="${isRtl ? "rtl" : "ltr"}">
        <h1>${escapeHtml(t.title)}</h1>
        ${t.excerpt ? `<p>${escapeHtml(t.excerpt)}</p>` : ""}
        <p><a href="${articleUrl}">${articleUrl}</a></p>
      </div>
    `;
 
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const chunk = subscribers.slice(i, i + BATCH_SIZE);
      const { error } = await resend.batch.send(
        chunk.map((s) => ({
          from,
          to: s.email,
          subject: t.title,
          html,
        })),
      );
      if (error) {
        // Fail the job -> BullMQ retries. Duplicate sends to earlier
        // successful chunks are possible on retry; acceptable for the
        // MVP, and the fix (per-chunk dispatch-log rows) is noted for
        // the hardening phase.
        throw new Error(`Resend batch failed: ${error.message}`);
      }
      totalSent += chunk.length;
 
      // Update job progress for observability in the queue UI.
      await job.updateProgress(
        Math.round(((i + chunk.length) / subscribers.length) * 100),
      );
    }
 
    console.log(
      `[newsletter] sent "${t.title}" (${t.locale}) to ${subscribers.length} subscriber(s)`,
    );
  }
 
  console.log(
    `[newsletter] article ${articleId}: ${totalSent} email(s) total (job ${job.id})`,
  );
}
 
const escapeHtml = (s: string): string =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
 