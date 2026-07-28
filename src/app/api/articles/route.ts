import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role, ArticleStatus, Locale } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { redisKeys } from "@/server/redis/client";
import { rateLimit, rateLimitHeaders } from "@/server/redis/rate-limit";
import { requireRole } from "@/lib/auth";
import {
  createArticleSchema,
  listArticlesQuerySchema,
  formatZodIssues,
} from "@/server/validators/article";
 
export const dynamic = "force-dynamic"; // never statically cache this handler
 
// ----------------------------------------------------------------
// Shared include + DTO shaping
// ----------------------------------------------------------------
 
const articleInclude = (locale: Locale) =>
  ({
    translations: { where: { locale } },
    author: { select: { id: true, name: true, authorSlug: true, image: true } },
    category: {
      include: { translations: { where: { locale }, select: { name: true, slug: true } } },
    },
    tags: {
      include: {
        tag: {
          include: {
            translations: { where: { locale }, select: { name: true, slug: true } },
          },
        },
      },
    },
    coverImage: {
      select: { url: true, width: true, height: true, altText: true },
    },
  }) satisfies Prisma.ArticleInclude;
 
type ArticleWithRelations = Prisma.ArticleGetPayload<{
  include: ReturnType<typeof articleInclude>;
}>;
 
/** Flatten the hub + single-locale translation into a clean DTO. */
const toDto = (a: ArticleWithRelations) => {
  const t = a.translations[0];
  return {
    id: a.id,
    publishedAt: a.publishedAt,
    isFeatured: a.isFeatured,
    isBreaking: a.isBreaking,
    viewCount: a.viewCount,
    title: t?.title ?? null,
    slug: t?.slug ?? null,
    excerpt: t?.excerpt ?? null,
    readingTime: t?.readingTime ?? null,
    locale: t?.locale ?? null,
    author: a.author
      ? { name: a.author.name, slug: a.author.authorSlug, image: a.author.image }
      : null,
    category: a.category?.translations[0] ?? null,
    tags: a.tags.map((at) => at.tag.translations[0]).filter(Boolean),
    coverImage: a.coverImage,
  };
};
 
// ----------------------------------------------------------------
// GET /api/articles
// ----------------------------------------------------------------
 
export async function GET(req: NextRequest) {
  const parsed = listArticlesQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters.", issues: formatZodIssues(parsed.error) },
      { status: 422 },
    );
  }
 
  const { locale, page, pageSize, category, tag, q } = parsed.data;
  const offset = (page - 1) * pageSize;
 
  try {
    const { ids, total, ranks } = q
      ? await searchArticleIds({ q, locale, category, tag, pageSize, offset })
      : await listArticleIds({ locale, category, tag, pageSize, offset });
 
    if (ids.length === 0) {
      return NextResponse.json({
        data: [],
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    }
 
    const articles = await prisma.article.findMany({
      where: { id: { in: ids } },
      include: articleInclude(locale),
    });
 
    // findMany doesn't preserve `IN (...)` order — restore it
    // (rank order for search, publishedAt order for listing).
    const byId = new Map(articles.map((a) => [a.id, a]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as ArticleWithRelations[];
 
    return NextResponse.json({
      data: ordered.map((a) => ({
        ...toDto(a),
        ...(ranks ? { rank: ranks.get(a.id) } : {}),
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error("[GET /api/articles]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
 
interface ListParams {
  locale: Locale;
  category?: string;
  tag?: string;
  pageSize: number;
  offset: number;
}
 
/** Standard (non-search) listing via Prisma, newest first. */
async function listArticleIds({ locale, category, tag, pageSize, offset }: ListParams) {
  const where: Prisma.ArticleWhereInput = {
    status: ArticleStatus.PUBLISHED,
    translations: { some: { locale } },
    ...(category && {
      category: { translations: { some: { slug: category, locale } } },
    }),
    ...(tag && {
      tags: { some: { tag: { translations: { some: { slug: tag, locale } } } } },
    }),
  };
 
  const [rows, total] = await prisma.$transaction([
    prisma.article.findMany({
      where,
      select: { id: true },
      orderBy: { publishedAt: "desc" },
      take: pageSize,
      skip: offset,
    }),
    prisma.article.count({ where }),
  ]);
 
  return { ids: rows.map((r) => r.id), total, ranks: null };
}
 
/**
 * Full-text search via raw SQL.
 *
 * - websearch_to_tsquery gives Google-ish syntax ("exact phrase",
 *   -exclude, OR) and never throws on user input, unlike
 *   to_tsquery.
 * - locale_to_regconfig() (from our FTS migration) picks the same
 *   text-search config the trigger used to build the vector —
 *   query-time and index-time stemming MUST match or recall breaks.
 * - Parameters are bound via Prisma's tagged template (no string
 *   interpolation → no SQL injection).
 */
async function searchArticleIds({
  q,
  locale,
  category,
  tag,
  pageSize,
  offset,
}: ListParams & { q: string }) {
  const categoryFilter = category
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM "category_translations" ct
        WHERE ct."categoryId" = a."categoryId"
          AND ct.slug = ${category}
          AND ct.locale = at.locale
      )`
    : Prisma.empty;
 
  const tagFilter = tag
    ? Prisma.sql`AND EXISTS (
        SELECT 1
        FROM "article_tags" atg
        JOIN "tag_translations" tt
          ON tt."tagId" = atg."tagId"
        WHERE atg."articleId" = a.id
          AND tt.slug = ${tag}
          AND tt.locale = at.locale
      )`
    : Prisma.empty;
 
  const baseWhere = Prisma.sql`
    FROM "article_translations" at
    JOIN "articles" a ON a.id = at."articleId"
    WHERE at.locale = ${locale}::"Locale"
      AND a.status = 'PUBLISHED'
      AND at."searchVector" @@ websearch_to_tsquery(locale_to_regconfig(at.locale), ${q})
      ${categoryFilter}
      ${tagFilter}
  `;
 
  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<{ articleId: string; rank: number }[]>(Prisma.sql`
      SELECT
        at."articleId",
        ts_rank(
          at."searchVector",
          websearch_to_tsquery(locale_to_regconfig(at.locale), ${q})
        ) AS rank
      ${baseWhere}
      ORDER BY rank DESC, a."publishedAt" DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `),
    prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count ${baseWhere}
    `),
  ]);
 
  return {
    ids: rows.map((r) => r.articleId),
    total: countRows[0]?.count ?? 0,
    ranks: new Map(rows.map((r) => [r.articleId, r.rank])),
  };
}
 
// ----------------------------------------------------------------
// POST /api/articles
// ----------------------------------------------------------------
 
export async function POST(req: NextRequest) {
  // 1. RBAC — Admins/Editors have full access; Authors may create
  //    articles but only in DRAFT or IN_REVIEW status (enforced
  //    after validation below).
  const guard = await requireRole([Role.ADMIN, Role.EDITOR, Role.AUTHOR]);
  if (!guard.ok) return guard.response;
 
  // 2. Rate limit — per user, 20 creates/minute is generous for
  //    humans and hostile to scripts.
  const rl = await rateLimit({
    key: redisKeys.rateLimit("articles:write", guard.user.id),
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Slow down." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }
 
  // 3. Validate.
  const json = await req.json().catch(() => null);
  const parsed = createArticleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: formatZodIssues(parsed.error) },
      { status: 422 },
    );
  }
  const input = parsed.data;
 
  // 3b. Author restrictions: Authors may only submit DRAFT or
  //     IN_REVIEW; publishing/scheduling is an editorial decision.
  //     Editorial flags (featured/breaking) are likewise stripped —
  //     they change homepage placement, which Authors don't control.
  const isPrivileged =
    guard.user.role === Role.ADMIN || guard.user.role === Role.EDITOR;
 
  if (!isPrivileged) {
    if (
      input.status === ArticleStatus.PUBLISHED ||
      input.status === ArticleStatus.SCHEDULED
    ) {
      return NextResponse.json(
        {
          error:
            "Authors may only create DRAFT or IN_REVIEW articles. Publishing requires an Editor or Admin.",
        },
        { status: 403 },
      );
    }
    input.isFeatured = false;
    input.isBreaking = false;
  }
 
  // 4. Persist — single nested write; Prisma wraps it in a
  //    transaction, so a failing translation insert (e.g. slug
  //    collision) rolls back the hub row too.
  try {
    const article = await prisma.article.create({
      data: {
        status: input.status,
        scheduledFor: input.scheduledFor ?? null,
        publishedAt:
          input.status === ArticleStatus.PUBLISHED ? new Date() : null,
        isFeatured: input.isFeatured,
        isBreaking: input.isBreaking,
        allowComments: input.allowComments,
        authorId: guard.user.id,
        categoryId: input.categoryId ?? null,
        coverImageId: input.coverImageId ?? null,
        tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
        translations: {
          create: input.translations.map((t) => ({
            locale: t.locale,
            title: t.title,
            slug: t.slug,
            excerpt: t.excerpt ?? null,
            content: t.content as Prisma.InputJsonValue,
            contentText: t.contentText,
            seoTitle: t.seoTitle ?? null,
            seoDescription: t.seoDescription ?? null,
            ogImageUrl: t.ogImageUrl ?? null,
            readingTime: Math.max(
              1,
              Math.round(t.contentText.split(/\s+/).filter(Boolean).length / 200),
            ),
          })),
        },
      },
      include: { translations: true, tags: true },
    });
 
    return NextResponse.json(
      { data: article },
      { status: 201, headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint — almost certainly (slug, locale).
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "A translation with this slug already exists for that locale." },
          { status: 409 },
        );
      }
      // FK violation — bad categoryId / tagId / coverImageId.
      if (err.code === "P2003") {
        return NextResponse.json(
          { error: "Referenced category, tag, or media does not exist." },
          { status: 400 },
        );
      }
    }
    console.error("[POST /api/articles]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}