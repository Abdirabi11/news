import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { redisKeys } from "@/server/redis/client";
import { rateLimit, rateLimitHeaders } from "@/server/redis/rate-limit";
import { requireRole } from "@/lib/auth";
import { formatZodIssues } from "@/server/validators/article";
import { updateCategorySchema } from "@/server/validators/taxonomy";
 
export const dynamic = "force-dynamic";
 
type RouteContext = { params: Promise<{ id: string }> };
 
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
 
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
  const parsed = updateCategorySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: formatZodIssues(parsed.error) },
      { status: 422 },
    );
  }
  const input = parsed.data;
 
  // Hierarchy guards: no self-parenting, no cycles (child as parent).
  if (input.parentId) {
    if (input.parentId === id) {
      return NextResponse.json(
        { error: "A category cannot be its own parent." },
        { status: 422 },
      );
    }
    const parent = await prisma.category.findUnique({
      where: { id: input.parentId },
      select: { parentId: true },
    });
    if (!parent) {
      return NextResponse.json(
        { error: "Parent category does not exist." },
        { status: 400 },
      );
    }
    // One level of nesting only (World > Africa) — keeps nav menus
    // and breadcrumbs simple. Also inherently prevents cycles.
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Only one level of category nesting is supported." },
        { status: 422 },
      );
    }
  }
 
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id },
        data: {
          ...(input.parentId !== undefined && { parentId: input.parentId }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        },
      });
 
      for (const t of input.translations ?? []) {
        await tx.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: id, locale: t.locale } },
          create: { categoryId: id, ...t },
          update: { name: t.name, slug: t.slug, description: t.description },
        });
      }
 
      return tx.category.findUniqueOrThrow({
        where: { id },
        include: { translations: true, children: true },
      });
    });
 
    return NextResponse.json({ data: updated }, { headers: rateLimitHeaders(rl) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "Category not found." }, { status: 404 });
      }
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "A category with this slug already exists for that locale." },
          { status: 409 },
        );
      }
    }
    console.error("[PATCH /api/categories/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
 
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
 
  const guard = await requireRole([Role.ADMIN]);
  if (!guard.ok) return guard.response;
 
  try {
    await prisma.category.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }
    console.error("[DELETE /api/categories/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}