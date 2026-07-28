import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { redisKeys } from "@/server/redis/client";
import { rateLimit, rateLimitHeaders } from "@/server/redis/rate-limit";
import { requireRole } from "@/lib/auth";
import { localeSchema, formatZodIssues } from "@/server/validators/article";
import { createTagSchema } from "@/server/validators/taxonomy";
 
export const dynamic = "force-dynamic";
 
const listTagsQuerySchema = z.object({
  locale: localeSchema.optional(),
  search: z.string().trim().min(1).max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
 
export async function GET(req: NextRequest) {
  const parsed = listTagsQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters.", issues: formatZodIssues(parsed.error) },
      { status: 422 },
    );
  }
  const { locale, search, page, pageSize } = parsed.data;
 
  const where: Prisma.TagWhereInput = {
    ...(search || locale
      ? {
          translations: {
            some: {
              ...(locale && { locale }),
              ...(search && {
                name: { startsWith: search, mode: "insensitive" },
              }),
            },
          },
        }
      : {}),
  };
 
  const [tags, total] = await prisma.$transaction([
    prisma.tag.findMany({
      where,
      include: {
        translations: locale ? { where: { locale } } : true,
        _count: { select: { articles: true } },
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.tag.count({ where }),
  ]);
 
  return NextResponse.json({
    data: tags,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
 
export async function POST(req: NextRequest) {
  // Authors can create tags too — tagging happens mid-writing and
  // shouldn't require pinging an editor.
  const guard = await requireRole([Role.ADMIN, Role.EDITOR, Role.AUTHOR]);
  if (!guard.ok) return guard.response;
 
  const rl = await rateLimit({
    key: redisKeys.rateLimit("taxonomy:write", guard.user.id),
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
  const parsed = createTagSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: formatZodIssues(parsed.error) },
      { status: 422 },
    );
  }
 
  try {
    const tag = await prisma.tag.create({
      data: { translations: { create: parsed.data.translations } },
      include: { translations: true },
    });
    return NextResponse.json(
      { data: tag },
      { status: 201, headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A tag with this slug already exists for that locale." },
        { status: 409 },
      );
    }
    console.error("[POST /api/tags]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}