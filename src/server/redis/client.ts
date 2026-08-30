import Redis, { type RedisOptions } from "ioredis";
 
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
 
const baseOptions: RedisOptions = {
  // Fail fast in the request path instead of queueing commands
  // forever when Redis is down.
  connectTimeout: 5_000,
  retryStrategy: (times) => Math.min(times * 200, 2_000),
};
 
declare global {
  var redisGlobal: Redis | undefined;
}
 
const createRedisClient = () => {
  const client = new Redis(REDIS_URL, baseOptions);
  client.on("error", (err) => {
    // ioredis emits 'error' on every failed reconnect attempt; log
    // without crashing the process (unhandled 'error' events throw).
    console.error("[redis] connection error:", err.message);
  });
  return client;
};
 
/** Shared client for caching, rate limiting, counters, sorted sets. */
export const redis: Redis = globalThis.redisGlobal ?? createRedisClient();
 
if (process.env.NODE_ENV !== "production") {
  globalThis.redisGlobal = redis;
}

export const redisKeys = {
  /** HINCRBY buffer of pending views, flushed to Postgres by /api/cron/sync-views. */
  pendingViews: () => "views:pending",
  /** Per-locale trending sorted set (member = articleId, score = decayed views). */
  trending: (locale: string) => `trending:${locale}`,
  /** Cached serialized query results. */
  cache: (name: string, ...parts: string[]) =>
    `cache:${name}:${parts.join(":")}`,
  /** Sliding-window rate limit bucket. */
  rateLimit: (scope: string, identifier: string) =>
    `rl:${scope}:${identifier}`,
} as const;