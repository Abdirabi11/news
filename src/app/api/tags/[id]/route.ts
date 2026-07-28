import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { redisKeys } from "@/server/redis/client";
import { rateLimit, rateLimitHeaders } from "@/server/redis/rate-limit";
import { requireRole } from "@/lib/auth";
import { formatZodIssues } from "@/server/validators/article";
import { updateTagSchema } from "@/server/validators/taxonomy";
 
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
  const parsed = updateTagSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: formatZodIssues(parsed.error) },
      { status: 422 },
    );
  }
 
  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Existence check (upserts alone would silently create rows
      // for a deleted tag id — FK prevents it, but 404 is clearer).
      await tx.tag.findUniqueOrThrow({ where: { id }, select: { id: true } });
 
      for (const t of parsed.data.translations ?? []) {
        await tx.tagTranslation.upsert({
          where: { tagId_locale: { tagId: id, locale: t.locale } },
          create: { tagId: id, ...t },
          update: { name: t.name, slug: t.slug },
        });
      }
 
      return tx.tag.findUniqueOrThrow({
        where: { id },
        include: { translations: true },
      });
    });
 
    return NextResponse.json({ data: updated }, { headers: rateLimitHeaders(rl) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "Tag not found." }, { status: 404 });
      }
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "A tag with this slug already exists for that locale." },
          { status: 409 },
        );
      }
    }
    console.error("[PATCH /api/tags/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
 
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
 
  const guard = await requireRole([Role.ADMIN, Role.EDITOR]);
  if (!guard.ok) return guard.response;
 
  try {
    await prisma.tag.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Tag not found." }, { status: 404 });
    }
    console.error("[DELETE /api/tags/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}