import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { redisKeys } from "@/server/redis/client";
import { rateLimit, rateLimitHeaders } from "@/server/redis/rate-limit";
import { requireRole } from "@/lib/auth";
import { localeSchema, formatZodIssues } from "@/server/validators/article";
import { createCategorySchema } from "@/server/validators/taxonomy";
 
export const dynamic = "force-dynamic";
 
export async function GET(req: NextRequest) {
  const localeParam = req.nextUrl.searchParams.get("locale");
  const locale = localeParam ? localeSchema.safeParse(localeParam) : null;
  if (locale && !locale.success) {
    return NextResponse.json({ error: "Invalid locale." }, { status: 422 });
  }
 
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }],
    include: {
      translations: locale?.success ? { where: { locale: locale.data } } : true,
      _count: { select: { articles: true } },
    },
  });
 
  return NextResponse.json({ data: categories });
}
 
export async function POST(req: NextRequest) {
  const guard = await requireRole([Role.ADMIN, Role.EDITOR]);
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
  const parsed = createCategorySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: formatZodIssues(parsed.error) },
      { status: 422 },
    );
  }
  const input = parsed.data;
 
  try {
    const category = await prisma.category.create({
      data: {
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder,
        translations: { create: input.translations },
      },
      include: { translations: true },
    });
    return NextResponse.json(
      { data: category },
      { status: 201, headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "A category with this slug already exists for that locale." },
          { status: 409 },
        );
      }
      if (err.code === "P2003") {
        return NextResponse.json(
          { error: "Parent category does not exist." },
          { status: 400 },
        );
      }
    }
    console.error("[POST /api/categories]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
 