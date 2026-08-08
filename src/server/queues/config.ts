import { Queue, type JobsOptions } from "bullmq";
import { createBullConnection } from "@/server/redis/client";
 
export const QUEUE = {
  publishScheduled: "publish-scheduled",
  flushViews: "flush-views",
  recalcTrending: "recalc-trending",
  processMedia: "process-media",
  newsletter: "newsletter",
} as const;
 
export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];
 
/** Sensible defaults: 3 attempts, exponential backoff, bounded history. */
export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 1_000 },
};
 
// ----------------------------------------------------------------
// Job payload types (shared contract between enqueuers & workers)
// ----------------------------------------------------------------
 
export interface ProcessMediaJob {
  mediaId: string;
}
 
export interface NewsletterJob {
  articleId: string;
  /** Restrict dispatch to specific locales; defaults to all translated. */
  locales?: string[];
}
 
// Cron-driven jobs (publish scan, flush, trending) carry no payload.
 
// ----------------------------------------------------------------
// Lazily-created queue instances
// ----------------------------------------------------------------
 
declare global {
  // eslint-disable-next-line no-var
  var bullQueues: Map<QueueName, Queue> | undefined;
}
 
const queueCache: Map<QueueName, Queue> =
  globalThis.bullQueues ?? new Map<QueueName, Queue>();
if (process.env.NODE_ENV !== "production") {
  globalThis.bullQueues = queueCache;
}
 
export function getQueue(name: QueueName): Queue {
  let q = queueCache.get(name);
  if (!q) {
    q = new Queue(name, {
      // FIX: Cast as 'any' to bypass the BullMQ/ioredis strict version mismatch
      connection: createBullConnection() as any,
      defaultJobOptions,
    });
    queueCache.set(name, q);
  }
  return q;
}
 
// Typed convenience enqueuers used from Route Handlers:
 
export const enqueueMediaProcessing = (data: ProcessMediaJob) =>
  getQueue(QUEUE.processMedia).add("process", data);
 
export const enqueueNewsletter = (data: NewsletterJob) =>
  getQueue(QUEUE.newsletter).add("dispatch", data);