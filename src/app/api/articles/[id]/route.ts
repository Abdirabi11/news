import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role, ArticleStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { redisKeys } from "@/server/redis/client";
import { rateLimit, rateLimitHeaders } from "@/server/redis/rate-limit";
import { auth, requireRole } from "@/lib/auth";
import {
  updateArticleSchema,
  formatZodIssues,
} from "@/server/validators/article";
 
export const dynamic = "force-dynamic";
 
type RouteContext = { params: Promise<{ id: string }> };
 
const fullInclude = {
  translations: true,
  author: { select: { id: true, name: true, authorSlug: true, image: true } },
  editor: { select: { id: true, name: true } },
  category: { include: { translations: true } },
  tags: { include: { tag: { include: { translations: true } } } },
  coverImage: true,
} satisfies Prisma.ArticleInclude;
 
const readingTimeFromText = (text: string) =>
  Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
 
// ----------------------------------------------------------------
// GET
// ----------------------------------------------------------------
 
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
 
  const article = await prisma.article.findUnique({
    where: { id },
    include: fullInclude,
  });
  if (!article) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }
 
  // Unpublished articles are only visible to staff or their author.
  if (article.status !== ArticleStatus.PUBLISHED) {
    const session = await auth();
    const u = session?.user;
    const canView =
      u &&
      (u.role === Role.ADMIN ||
        u.role === Role.EDITOR ||
        (u.role === Role.AUTHOR && u.id === article.authorId));
    if (!canView) {
      // 404 (not 403) so unpublished IDs aren't enumerable.
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }
  }
 
  return NextResponse.json({ data: article });
}
 
// ----------------------------------------------------------------
// PATCH
// ----------------------------------------------------------------
 
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
 
  const guard = await requireRole([Role.ADMIN, Role.EDITOR, Role.AUTHOR]);
  if (!guard.ok) return guard.response;
 
  const rl = await rateLimit({
    key: redisKeys.rateLimit("articles:write", guard.user.id),
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }
 
  const existing = await prisma.article.findUnique({
    where: { id },
    select: { id: true, status: true, authorId: true, publishedAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }
 
  const json = await req.json().catch(() => null);
  const parsed = updateArticleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: formatZodIssues(parsed.error) },
      { status: 422 },
    );
  }
  const input = parsed.data;
 
  // ---- Author restrictions ----
  const isPrivileged =
    guard.user.role === Role.ADMIN || guard.user.role === Role.EDITOR;
 
  if (!isPrivileged) {
    if (existing.authorId !== guard.user.id) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }
    const editableStates: ArticleStatus[] = [
      ArticleStatus.DRAFT,
      ArticleStatus.IN_REVIEW,
    ];
    if (!editableStates.includes(existing.status)) {
      return NextResponse.json(
        { error: "Authors can only edit articles in DRAFT or IN_REVIEW." },
        { status: 403 },
      );
    }
    if (input.status && !editableStates.includes(input.status)) {
      return NextResponse.json(
        { error: "Authors may only set status to DRAFT or IN_REVIEW." },
        { status: 403 },
      );
    }
    delete input.isFeatured;
    delete input.isBreaking;
    delete input.scheduledFor;
  }
 
  // ---- Status/scheduling invariants (mirrors createArticleSchema) ----
  const nextStatus = input.status ?? existing.status;
  if (nextStatus === ArticleStatus.SCHEDULED) {
    const when = input.scheduledFor;
    if (!when || when.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "SCHEDULED articles need a future scheduledFor." },
        { status: 422 },
      );
    }
  }
 
  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Hub fields. First-time publish stamps publishedAt; a
      // re-publish of a previously published article keeps the
      // original timestamp (stable URLs/sitemaps/SEO).
      await tx.article.update({
        where: { id },
        data: {
          ...(input.status !== undefined && { status: input.status }),
          ...(input.status === ArticleStatus.PUBLISHED &&
            !existing.publishedAt && { publishedAt: new Date() }),
          ...(input.scheduledFor !== undefined && {
            scheduledFor:
              nextStatus === ArticleStatus.SCHEDULED ? input.scheduledFor : null,
          }),
          ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
          ...(input.coverImageId !== undefined && {
            coverImageId: input.coverImageId,
          }),
          ...(input.isFeatured !== undefined && { isFeatured: input.isFeatured }),
          ...(input.isBreaking !== undefined && { isBreaking: input.isBreaking }),
          ...(input.allowComments !== undefined && {
            allowComments: input.allowComments,
          }),
          // Track who last touched it editorially.
          ...(isPrivileged && { editorId: guard.user.id }),
        },
      });
 
      // Tags: full replace when provided.
      if (input.tagIds) {
        await tx.articleTag.deleteMany({ where: { articleId: id } });
        if (input.tagIds.length > 0) {
          await tx.articleTag.createMany({
            data: input.tagIds.map((tagId) => ({ articleId: id, tagId })),
          });
        }
      }
 
      // Translations: upsert by (articleId, locale). Locales not in
      // the payload are untouched — partial translation stays a
      // first-class state.
      for (const t of input.translations ?? []) {
        const data = {
          title: t.title,
          slug: t.slug,
          excerpt: t.excerpt ?? null,
          content: t.content as Prisma.InputJsonValue,
          contentText: t.contentText,
          seoTitle: t.seoTitle ?? null,
          seoDescription: t.seoDescription ?? null,
          ogImageUrl: t.ogImageUrl ?? null,
          readingTime: readingTimeFromText(t.contentText),
        };
        await tx.articleTranslation.upsert({
          where: { articleId_locale: { articleId: id, locale: t.locale } },
          create: { articleId: id, locale: t.locale, ...data },
          update: data,
        });
      }
 
      return tx.article.findUniqueOrThrow({
        where: { id },
        include: fullInclude,
      });
    });
 
    return NextResponse.json(
      { data: updated },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "A translation with this slug already exists for that locale." },
          { status: 409 },
        );
      }
      if (err.code === "P2003") {
        return NextResponse.json(
          { error: "Referenced category, tag, or media does not exist." },
          { status: 400 },
        );
      }
    }
    console.error("[PATCH /api/articles/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
 
// ----------------------------------------------------------------
// DELETE
// ----------------------------------------------------------------
 
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
 
  const guard = await requireRole([Role.ADMIN]);
  if (!guard.ok) return guard.response;
 
  try {
    await prisma.article.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }
    console.error("[DELETE /api/articles/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
