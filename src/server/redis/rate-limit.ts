import { redis } from "@/server/redis/client";
 
const SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;
 
// defineCommand registers the script once (EVALSHA thereafter).
redis.defineCommand("fixedWindowHit", {
  numberOfKeys: 1,
  lua: SCRIPT,
});
 
declare module "ioredis" {
  interface RedisCommander<Context> {
    fixedWindowHit(
      key: string,
      windowMs: string | number,
    ): Promise<[number, number]>;
  }
}
 
export interface RateLimitOptions {
  /** Full Redis key — build it with redisKeys.rateLimit(). */
  key: string;
  /** Max requests per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Allow the request if Redis errors (default true). */
  failOpen?: boolean;
}
 
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
}
 
export async function rateLimit({
  key,
  limit,
  windowMs,
  failOpen = true,
}: RateLimitOptions): Promise<RateLimitResult> {
  try {
    const [count, pttl] = await redis.fixedWindowHit(key, windowMs);
    const resetAt = Date.now() + (pttl > 0 ? pttl : windowMs);
    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  } catch (err) {
    console.error("[rate-limit] redis error:", err);
    return {
      success: failOpen,
      limit,
      remaining: failOpen ? limit : 0,
      resetAt: Date.now() + windowMs,
    };
  }
}
 
/** Standard headers for rate-limited responses (RFC 6585 style). */
export const rateLimitHeaders = (r: RateLimitResult): HeadersInit => ({
  "X-RateLimit-Limit": String(r.limit),
  "X-RateLimit-Remaining": String(r.remaining),
  "X-RateLimit-Reset": String(Math.ceil(r.resetAt / 1000)),
  ...(r.success
    ? {}
    : { "Retry-After": String(Math.max(1, Math.ceil((r.resetAt - Date.now()) / 1000))) }),
});