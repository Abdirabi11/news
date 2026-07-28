import { type Job, UnrecoverableError } from "bullmq";
import { prisma } from "@/server/db/client";
import { type ProcessMediaJob } from "@/server/queues/config";
 
export async function processMediaProcessor(
  job: Job<ProcessMediaJob>,
): Promise<void> {
  const { mediaId } = job.data;
 
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) {
    // Deleted before we got to it — retrying will never succeed.
    throw new UnrecoverableError(`Media ${mediaId} no longer exists`);
  }
  if (media.processed) return; // idempotent re-delivery
 
  // 1. Verify the object actually landed in the bucket. A plain
  //    HEAD against the public CDN URL suffices for the MVP; R2/S3
  //    are strongly consistent. A 404 fails the job -> BullMQ
  //    retries with backoff, covering the "registered a moment
  //    before the PUT finished" race.
  const head = await fetch(media.url, { method: "HEAD" });
  if (!head.ok) {
    throw new Error(
      `Object not reachable yet (HTTP ${head.status}) for media ${mediaId} — will retry`,
    );
  }
 
  // 2. TODO: real image pipeline (npm install sharp):
  //    - GetObject from the bucket (don't re-download via CDN)
  //    - const meta = await sharp(buffer).metadata()
  //      -> overwrite width/height with TRUE values (client-reported
  //         ones are unverified)
  //    - generate variants (e.g. 320/640/1280 WebP) and PutObject
  //      them under `${storageKey}.variants/`
  //    For now, simulate the work:
  const contentLength = head.headers.get("content-length");
  console.log(
    `[process-media] verified ${media.storageKey} (${contentLength ?? "?"} bytes) — variant generation mocked`,
  );
 
  // 3. Mark usable.
  await prisma.media.update({
    where: { id: mediaId },
    data: { processed: true },
  });
}