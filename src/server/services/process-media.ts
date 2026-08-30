import { prisma } from "@/server/db/client";

/**
 * Verifies the uploaded object is actually reachable, then marks it
 * usable. Runs fire-and-forget via `after()` right after a Media row
 * is registered — no queue needed for a single HEAD request + one
 * update. If the HEAD fails, `processed` just stays `false`; there is
 * no retry, since nothing re-invokes this outside the upload path.
 */
export async function processMedia(mediaId: string): Promise<void> {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media || media.processed) return; // deleted, or already handled

  try {
    const head = await fetch(media.url, { method: "HEAD" });
    if (!head.ok) {
      console.error(
        `[process-media] object not reachable (HTTP ${head.status}) for media ${mediaId}`,
      );
      return;
    }

    // TODO: real image pipeline (npm install sharp):
    //    - fetch the object, read TRUE dimensions server-side
    //      (client-reported width/height are unverified)
    //    - generate thumbnail variants
    // For now, verifying reachability is enough to flip `processed`.
    await prisma.media.update({
      where: { id: mediaId },
      data: { processed: true },
    });
  } catch (err) {
    console.error(`[process-media] failed for media ${mediaId}:`, err);
  }
}
