import { qstash, siteUrl } from "@/server/qstash/client";

export interface NewsletterDispatchJob {
  articleId: string;
  /** Restrict dispatch to specific locales; defaults to all translated. */
  locales?: string[];
}

/**
 * Fire-and-forget: publishes a one-off QStash message that hits
 * /api/newsletter/dispatch. Call this from wherever "send newsletter
 * for this article" gets triggered (not yet wired to any UI action —
 * this is the drop-in replacement for the old BullMQ enqueueNewsletter).
 */
export async function enqueueNewsletterDispatch(
  data: NewsletterDispatchJob,
): Promise<void> {
  await qstash.publishJSON({
    url: `${siteUrl()}/api/newsletter/dispatch`,
    body: data,
    retries: 3,
  });
}
