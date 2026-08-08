import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { redisKeys } from "@/server/redis/client";
import { rateLimit, rateLimitHeaders } from "@/server/redis/rate-limit";
import { formatZodIssues } from "@/server/validators/article";
import { presignMediaSchema } from "@/server/validators/media";
import { signUpload } from "@/server/services/storage";
 
export const dynamic = "force-dynamic";
 
export async function POST(req: NextRequest) {
  const guard = await requireRole([Role.ADMIN, Role.EDITOR, Role.AUTHOR]);
  if (!guard.ok) return guard.response;
 
  const rl = await rateLimit({
    key: redisKeys.rateLimit("media:presign", guard.user.id),
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many upload requests." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }
 
  const json = await req.json().catch(() => null);
  const parsed = presignMediaSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: formatZodIssues(parsed.error) },
      { status: 422 },
    );
  }

  try {
    // Generate Cloudinary upload signature
    const signedData = signUpload({ folder: "newsroom" });
 
    return NextResponse.json(
      { data: signedData },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    console.error("[POST /api/media/presign]", err);
    return NextResponse.json(
      { error: "Could not create upload signature." },
      { status: 500 },
    );
  }
}