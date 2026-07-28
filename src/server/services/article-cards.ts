import { Prisma, Locale, ArticleStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { redis, redisKeys } from "@/server/redis/client";
 
// ----------------------------------------------------------------
// Select shape & DTO
// ----------------------------------------------------------------
 
const cardSelect = (locale: Locale) =>
  ({
    id: true,
    publishedAt: true,
    isBreaking: true,
    viewCount: true,
    author: { select: { name: true, authorSlug: true } },
    coverImage: { select: { url: true, altText: true } },
    category: {
      select: {
        translations: { where: { locale }, select: { name: true, slug: true } },
      },
    },
    translations: {
      where: { locale },
      select: { slug: true, title: true, excerpt: true, readingTime: true },
    },
  }) satisfies Prisma.ArticleSelect;
 
type CardRow = Prisma.ArticleGetPayload<{
  select: ReturnType<typeof cardSelect>;
}>;
 
export interface ArticleCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  readingTime: number;
  publishedAt: Date | null;
  isBreaking: boolean;
  viewCount: number;
  authorName: string | null;
  authorSlug: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  cover: { url: string; altText: string | null } | null;
}
 
const toCard = (row: CardRow): ArticleCard | null => {
  const t = row.translations[0];
  if (!t) return null;
  const cat = row.category?.translations[0] ?? null;
  return {
    id: row.id,
    slug: t.slug,
    title: t.title,
    excerpt: t.excerpt,
    readingTime: t.readingTime,
    publishedAt: row.publishedAt,
    isBreaking: row.isBreaking,
    viewCount: row.viewCount,
    authorName: row.author?.name ?? null,
    authorSlug: row.author?.authorSlug ?? null,
    categoryName: cat?.name ?? null,
    categorySlug: cat?.slug ?? null,
    cover: row.coverImage,
  };
};
 
export interface CardPage {
  cards: ArticleCard[];
  total: number;
  totalPages: number;
}
 
// ----------------------------------------------------------------
// Filtered listing (category / tag / author / anything Prisma-y)
// ----------------------------------------------------------------
 
export async function fetchArticleCards(opts: {
  locale: Locale;
  where?: Prisma.ArticleWhereInput;
  page?: number;
  pageSize?: number;
}): Promise<CardPage> {
  const { locale, where = {}, page = 1, pageSize = 12 } = opts;
 
  const fullWhere: Prisma.ArticleWhereInput = {
    status: ArticleStatus.PUBLISHED,
    translations: { some: { locale } },
    ...where,
  };
 
  const [rows, total] = await prisma.$transaction([
    prisma.article.findMany({
      where: fullWhere,
      orderBy: { publishedAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: cardSelect(locale),
    }),
    prisma.article.count({ where: fullWhere }),
  ]);
 
  return {
    cards: rows.map(toCard).filter((c): c is ArticleCard => c !== null),
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
 
// ----------------------------------------------------------------
// Full-text search (same two-step pattern as GET /api/articles:
// raw ranked ids from the GIN index, then hydrate + reorder)
// ----------------------------------------------------------------
 
export async function searchArticleCards(opts: {
  locale: Locale;
  q: string;
  page?: number;
  pageSize?: number;
}): Promise<CardPage> {
  const { locale, q, page = 1, pageSize = 12 } = opts;
  const offset = (page - 1) * pageSize;
 
  const baseWhere = Prisma.sql`
    FROM "article_translations" at
    JOIN "articles" a ON a.id = at."articleId"
    WHERE at.locale = ${locale}::"Locale"
      AND a.status = 'PUBLISHED'
      AND at."searchVector" @@ websearch_to_tsquery(locale_to_regconfig(at.locale), ${q})
  `;
 
  const [ranked, countRows] = await Promise.all([
    prisma.$queryRaw<{ articleId: string }[]>(Prisma.sql`
      SELECT at."articleId"
      ${baseWhere}
      ORDER BY ts_rank(
        at."searchVector",
        websearch_to_tsquery(locale_to_regconfig(at.locale), ${q})
      ) DESC, a."publishedAt" DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `),
    prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count ${baseWhere}
    `),
  ]);
 
  const ids = ranked.map((r) => r.articleId);
  if (ids.length === 0) {
    return { cards: [], total: 0, totalPages: 1 };
  }
 
  const rows = await prisma.article.findMany({
    where: { id: { in: ids } },
    select: cardSelect(locale),
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const cards = ids
    .map((id) => byId.get(id))
    .filter((r): r is CardRow => r !== undefined)
    .map(toCard)
    .filter((c): c is ArticleCard => c !== null);
 
  const total = countRows[0]?.count ?? 0;
  return { cards, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
 
// ----------------------------------------------------------------
// Trending (Redis sorted set, maintained by the recalc worker)
// ----------------------------------------------------------------
 
export async function fetchTrendingCards(
  locale: Locale,
  limit = 5,
): Promise<ArticleCard[]> {
  let ids: string[];
  try {
    // Highest score first — the worker stores gravity-decayed scores.
    ids = await redis.zrevrange(redisKeys.trending(locale), 0, limit - 1);
  } catch (err) {
    console.error("[trending] redis read failed:", err);
    return []; // trending is decorative — never break a page for it
  }
  if (ids.length === 0) return [];
 
  const rows = await prisma.article.findMany({
    where: {
      id: { in: ids },
      status: ArticleStatus.PUBLISHED, // re-check: set lags reality ≤15min
    },
    select: cardSelect(locale),
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
 
  // Preserve the sorted-set order.
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is CardRow => r !== undefined)
    .map(toCard)
    .filter((c): c is ArticleCard => c !== null);
}