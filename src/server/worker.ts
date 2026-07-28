import "dotenv/config";
import { Worker, type Processor } from "bullmq";
import { createBullConnection } from "@/server/redis/client";
import { prisma } from "@/server/db/client";
import { QUEUE, getQueue, defaultJobOptions } from "@/server/queues/config";
import { publishScheduledProcessor } from "@/server/queues/processors/publish-scheduled";
import { flushViewsProcessor } from "@/server/queues/processors/flush-views";
import { recalcTrendingProcessor } from "@/server/queues/processors/recalc-trending";
import { processMediaProcessor } from "@/server/queues/processors/process-media";
import { dispatchNewsletterProcessor } from "@/server/queues/processors/dispatch-newsletter";
 
// ----------------------------------------------------------------
// Worker factory with shared logging
// ----------------------------------------------------------------
 
const workers: Worker[] = [];
 
function startWorker(
  name: string,
  processor: Processor,
  concurrency = 1,
): void {
  const worker = new Worker(name, processor, {
    connection: createBullConnection(),
    concurrency,
  });
 
  worker.on("completed", (job) => {
    console.log(`[worker:${name}] job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(
      `[worker:${name}] job ${job?.id} FAILED (attempt ${job?.attemptsMade}/${job?.opts.attempts}):`,
      err.message,
    );
  });
  worker.on("error", (err) => {
    console.error(`[worker:${name}] worker error:`, err.message);
  });
 
  workers.push(worker);
  console.log(`[worker:${name}] started (concurrency ${concurrency})`);
}
 
// ----------------------------------------------------------------
// Repeatable schedules
// ----------------------------------------------------------------
 
async function registerSchedules(): Promise<void> {
  // upsertJobScheduler is idempotent — safe on every boot, and
  // changing the interval here updates the existing scheduler
  // instead of stacking duplicates.
  await getQueue(QUEUE.publishScheduled).upsertJobScheduler(
    "publish-scheduled-every-minute",
    { every: 60_000 },
    { name: "scan", opts: defaultJobOptions },
  );
 
  await getQueue(QUEUE.flushViews).upsertJobScheduler(
    "flush-views-every-10-min",
    { every: 600_000 },
    { name: "flush", opts: defaultJobOptions },
  );
 
  await getQueue(QUEUE.recalcTrending).upsertJobScheduler(
    "recalc-trending-every-15-min",
    { every: 900_000 },
    { name: "recalc", opts: defaultJobOptions },
  );
 
  console.log("[worker] repeatable schedules registered");
}
 
// ----------------------------------------------------------------
// Boot & lifecycle
// ----------------------------------------------------------------
 
async function main(): Promise<void> {
  console.log("[worker] starting...");
 
  startWorker(QUEUE.publishScheduled, publishScheduledProcessor);
  startWorker(QUEUE.flushViews, flushViewsProcessor);
  startWorker(QUEUE.recalcTrending, recalcTrendingProcessor);
  startWorker(QUEUE.processMedia, processMediaProcessor, 3);
  startWorker(QUEUE.newsletter, dispatchNewsletterProcessor, 2);
 
  await registerSchedules();
 
  console.log("[worker] all workers running. Ctrl+C to stop.");
}
 
async function shutdown(signal: string): Promise<void> {
  console.log(`\n[worker] ${signal} received — draining...`);
  try {
    // close() waits for in-flight jobs to finish.
    await Promise.all(workers.map((w) => w.close()));
    await prisma.$disconnect();
  } catch (err) {
    console.error("[worker] error during shutdown:", err);
  } finally {
    process.exit(0);
  }
}
 
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
 
main().catch((err) => {
  console.error("[worker] fatal boot error:", err);
  process.exit(1);
});