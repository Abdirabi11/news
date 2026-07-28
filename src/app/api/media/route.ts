import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { redisKeys } from "@/server/redis/client";
import { rateLimit, rateLimitHeaders } from "@/server/redis/rate-limit";
import { requireRole } from "@/lib/auth";
import { formatZodIssues } from "@/server/validators/article";
import {
  registerMediaSchema,
  listMediaQuerySchema,
} from "@/server/validators/media";
import { publicUrl } from "@/server/services/storage";
 
export const dynamic = "force-dynamic";
 
export async function GET(req: NextRequest) {
  const guard = await requireRole([Role.ADMIN, Role.EDITOR, Role.AUTHOR]);
  if (!guard.ok) return guard.response;
 
  const parsed = listMediaQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters.", issues: formatZodIssues(parsed.error) },
      { status: 422 },
    );
  }
  const { page, pageSize } = parsed.data;
 
  const [items, total] = await prisma.$transaction([
    prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: { uploader: { select: { id: true, name: true } } },
    }),
    prisma.media.count(),
  ]);
 
  return NextResponse.json({
    data: items,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
 
export async function POST(req: NextRequest) {
  const guard = await requireRole([Role.ADMIN, Role.EDITOR, Role.AUTHOR]);
  if (!guard.ok) return guard.response;
 
  const rl = await rateLimit({
    key: redisKeys.rateLimit("media:register", guard.user.id),
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }
 
  const json = await req.json().catch(() => null);
  const parsed = registerMediaSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: formatZodIssues(parsed.error) },
      { status: 422 },
    );
  }
  const input = parsed.data;
 
  try {
    const media = await prisma.media.create({
      data: {
        uploaderId: guard.user.id,
        storageKey: input.storageKey,
        url: publicUrl(input.storageKey),
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        width: input.width ?? null,
        height: input.height ?? null,
        altText: input.altText ?? null,
        caption: input.caption ?? null,
        processed: false,
      },
    });
 
    // TODO(Phase 3): enqueue BullMQ "media:process" job here to
    // verify the object exists in the bucket, read true dimensions
    // server-side, and generate thumbnail variants.
 
    return NextResponse.json(
      { data: media },
      { status: 201, headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This object has already been registered." },
        { status: 409 },
      );
    }
    console.error("[POST /api/media]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}