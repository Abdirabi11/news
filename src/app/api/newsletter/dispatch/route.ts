import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { z } from "zod";
import { Resend } from "resend";
import { ArticleStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 100; // Resend batch endpoint limit

const bodySchema = z.object({
  articleId: z.string().cuid(),
  locales: z.array(z.string()).optional(),
});

/**
 * Triggered by a one-off QStash `publishJSON` call (see
 * enqueueNewsletterDispatch) rather than a schedule — this fires once
 * per "send newsletter for article X" action, not on a timer.
 * Replaces the old BullMQ `newsletter` worker; QStash gives the same
 * retry-with-backoff BullMQ provided (configured at publish time).
 */
export const POST = verifySignatureAppRouter(async (req: NextRequest) => {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
  }
  const { articleId, locales } = parsed.data;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { translations: true },
  });
  if (!article) {
    // No point retrying — QStash would just hit this same 200.
    console.error(`[newsletter] article ${articleId} no longer exists`);
    return NextResponse.json({ sent: 0 });
  }
  if (article.status !== ArticleStatus.PUBLISHED) {
    console.error(
      `[newsletter] article ${articleId} is ${article.status}, not PUBLISHED — aborting dispatch`,
    );
    return NextResponse.json({ sent: 0 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  if (!apiKey || !from) {
    console.warn(
      "[newsletter] RESEND_API_KEY / EMAIL_FROM not set — skipping send (dev mode)",
    );
    return NextResponse.json({ sent: 0, skipped: true });
  }
  const resend = new Resend(apiKey);

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
        // Non-2xx response -> QStash retries the whole request per
        // its configured backoff. Duplicate sends to earlier
        // successful chunks are possible on retry; acceptable for
        // the MVP (same trade-off the BullMQ version made).
        console.error(`[newsletter] Resend batch failed: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
      totalSent += chunk.length;
    }

    console.log(
      `[newsletter] sent "${t.title}" (${t.locale}) to ${subscribers.length} subscriber(s)`,
    );
  }

  console.log(`[newsletter] article ${articleId}: ${totalSent} email(s) total`);
  return NextResponse.json({ sent: totalSent });
});

const escapeHtml = (s: string): string =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
