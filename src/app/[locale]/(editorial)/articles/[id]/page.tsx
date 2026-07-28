/**
 * /[locale]/(editorial)/articles/[id] — create & edit route.
 *
 * id === "new"  -> create mode (empty editor)
 * otherwise     -> fetch the article with ALL translations
 *
 * Server-side rules mirror the API exactly:
 *  - Authors can only open their OWN articles (others -> 404, not
 *    403, so draft IDs aren't enumerable)
 *  - Authors get read-only awareness via isPrivileged=false: the
 *    editor hides publish/schedule/flags; the API re-enforces it
 *
 * Everything passed to the client editor is plain JSON (dates as
 * ISO strings) — Server Component props must be serializable.
 */
import { notFound, redirect } from "next/navigation";
import { Role, Locale } from "@prisma/client";
import { type JSONContent } from "@tiptap/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/client";
import {
  ArticleEditor,
  type ArticleDto,
  type TaxonomyOption,
  type EditorLocale,
  type EditorStatus,
} from "@/components/editorial/article-editor";

export default async function ArticleEditorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);
  const { role, id: userId } = session.user;
  const isPrivileged = role === Role.ADMIN || role === Role.EDITOR;

  // ---- Taxonomy options (names in the UI locale, en fallback) ----
  const uiLocale = (["en", "so", "ar"] as string[]).includes(locale)
    ? (locale as Locale)
    : Locale.en;

  const pickName = (
    translations: { locale: Locale; name: string }[],
  ): string =>
    translations.find((t) => t.locale === uiLocale)?.name ??
    translations.find((t) => t.locale === Locale.en)?.name ??
    translations[0]?.name ??
    "(unnamed)";

  const [categoryRows, tagRows] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { translations: { select: { locale: true, name: true } } },
    }),
    prisma.tag.findMany({
      orderBy: { createdAt: "desc" },
      include: { translations: { select: { locale: true, name: true } } },
    }),
  ]);

  const categories: TaxonomyOption[] = categoryRows.map((c) => ({
    id: c.id,
    name: pickName(c.translations),
  }));
  const tags: TaxonomyOption[] = tagRows.map((t) => ({
    id: t.id,
    name: pickName(t.translations),
  }));

  // ---- Create mode ----
  if (id === "new") {
    return (
      <ArticleEditor
        locale={locale}
        article={null}
        categories={categories}
        tags={tags}
        isPrivileged={isPrivileged}
      />
    );
  }

  // ---- Edit mode ----
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      translations: true,
      tags: { select: { tagId: true } },
      coverImage: { select: { id: true, url: true, altText: true } },
    },
  });

  if (!article) notFound();
  // Authors: own articles only. 404 (not 403) — don't leak existence.
  if (role === Role.AUTHOR && article.authorId !== userId) notFound();

  const dto: ArticleDto = {
    id: article.id,
    status: article.status as EditorStatus,
    scheduledFor: article.scheduledFor?.toISOString() ?? null,
    categoryId: article.categoryId,
    coverImage: article.coverImage,
    tagIds: article.tags.map((t) => t.tagId),
    isFeatured: article.isFeatured,
    isBreaking: article.isBreaking,
    allowComments: article.allowComments,
    translations: article.translations.map((t) => ({
      locale: t.locale as EditorLocale,
      title: t.title,
      slug: t.slug,
      excerpt: t.excerpt,
      content: t.content as JSONContent,
      seoTitle: t.seoTitle,
      seoDescription: t.seoDescription,
    })),
  };

  return (
    <ArticleEditor
      locale={locale}
      article={dto}
      categories={categories}
      tags={tags}
      isPrivileged={isPrivileged}
    />
  );
}
