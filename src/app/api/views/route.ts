import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trackView } from "@/server/services/views";
import { redis, redisKeys } from "@/server/redis/client";
 
export const dynamic = "force-dynamic";
 
const bodySchema = z.object({ articleId: z.string().cuid() });
 
export async function POST(req: NextRequest) {
  // Light per-IP ceiling: generous for humans reading fast, hostile
  // to naive count-inflation loops. Fail-open (it's just analytics).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  
  const rlKey = redisKeys.rateLimit("views", ip);
  let allowed = true;
  
  try {
    const hits = await redis.incr(rlKey);
    // If this is the first hit, set the window to 60 seconds (60_000ms)
    if (hits === 1) {
      await redis.expire(rlKey, 60);
    }
    // Limit to 60 views per minute per IP
    if (hits > 60) {
      allowed = false;
    }
  } catch (error) {
    // If Redis fails, fail-open (allow the request) so we don't break the app
    console.error("[views] rate limit error:", error);
  }

  if (!allowed) return new NextResponse(null, { status: 429 });
 
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 422 });
 
  await trackView(parsed.data.articleId);
  return new NextResponse(null, { status: 204 });
}