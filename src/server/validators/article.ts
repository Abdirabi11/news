import { z } from "zod";
import { ArticleStatus, Locale } from "@prisma/client";
 
// ----------------------------------------------------------------
// Primitives
// ----------------------------------------------------------------
 
export const localeSchema = z.nativeEnum(Locale);
 
/**
 * URL-safe slug: lowercase latin letters, digits, hyphens.
 * NOTE: we latinize Arabic/Somali slugs (as seeded). If you later
 * want native-script slugs, relax this to a unicode-aware pattern
 * and make sure encodeURIComponent handling is added on the
 * frontend link builders.
 */
export const slugSchema = z
  .string()
  .min(3)
  .max(200)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase letters, numbers and hyphens.",
  );
 
/**
 * Tiptap document. We validate the envelope strictly (must be a
 * `doc` with a content array) but stay permissive about node
 * internals — Tiptap's node set will grow (embeds, galleries) and
 * the editor is a trusted, RBAC-gated surface. Rendering (Phase 5)
 * whitelists node types again anyway.
 */
export const tiptapDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.record(z.unknown())).min(1, "Content cannot be empty."),
});
 
// ----------------------------------------------------------------
// Translations
// ----------------------------------------------------------------
 
export const articleTranslationInputSchema = z.object({
  locale: localeSchema,
  title: z.string().min(3).max(300),
  slug: slugSchema,
  excerpt: z.string().max(500).optional(),
  content: tiptapDocSchema,
  /**
   * Plain-text extraction of `content`, used by the tsvector
   * trigger. The CMS computes this on save; the API requires it so
   * search never silently degrades.
   */
  contentText: z.string().min(1).max(100_000),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  ogImageUrl: z.string().url().optional(),
});
 
// ----------------------------------------------------------------
// Create
// ----------------------------------------------------------------
 
export const createArticleSchema = z
  .object({
    status: z
      .nativeEnum(ArticleStatus)
      .default(ArticleStatus.DRAFT),
    scheduledFor: z.coerce.date().optional(),
    categoryId: z.string().cuid().optional(),
    coverImageId: z.string().cuid().optional(),
    tagIds: z.array(z.string().cuid()).max(10).default([]),
    isFeatured: z.boolean().default(false),
    isBreaking: z.boolean().default(false),
    allowComments: z.boolean().default(true),
    /**
     * 1–3 translations. An article may launch in a single language
     * (partial translation is a first-class state — see seed
     * Article B), but each locale may appear only once.
     */
    translations: z
      .array(articleTranslationInputSchema)
      .min(1, "At least one translation is required.")
      .max(3),
  })
  .superRefine((data, ctx) => {
    // No duplicate locales.
    const locales = data.translations.map((t) => t.locale);
    if (new Set(locales).size !== locales.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["translations"],
        message: "Duplicate locale in translations.",
      });
    }
 
    // SCHEDULED requires a future scheduledFor.
    if (data.status === ArticleStatus.SCHEDULED) {
      if (!data.scheduledFor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduledFor"],
          message: "scheduledFor is required when status is SCHEDULED.",
        });
      } else if (data.scheduledFor.getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduledFor"],
          message: "scheduledFor must be in the future.",
        });
      }
    }
 
    // scheduledFor is meaningless on other statuses.
    if (data.status !== ArticleStatus.SCHEDULED && data.scheduledFor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledFor"],
        message: "scheduledFor is only allowed when status is SCHEDULED.",
      });
    }
  });
 
export type CreateArticleInput = z.infer<typeof createArticleSchema>;
 
// ----------------------------------------------------------------
// Update (hub fields + upsertable translations)
// ----------------------------------------------------------------
 
export const updateArticleSchema = z.object({
  status: z.nativeEnum(ArticleStatus).optional(),
  scheduledFor: z.coerce.date().nullable().optional(),
  categoryId: z.string().cuid().nullable().optional(),
  coverImageId: z.string().cuid().nullable().optional(),
  tagIds: z.array(z.string().cuid()).max(10).optional(),
  isFeatured: z.boolean().optional(),
  isBreaking: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  /** Translations to upsert by locale (others are left untouched). */
  translations: z.array(articleTranslationInputSchema).max(3).optional(),
});
 
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
 
// ----------------------------------------------------------------
// List / search query (GET /api/articles)
// ----------------------------------------------------------------
 
export const listArticlesQuerySchema = z.object({
  locale: localeSchema.default(Locale.en),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  /** Category slug IN THE REQUESTED LOCALE. */
  category: slugSchema.optional(),
  /** Tag slug in the requested locale. */
  tag: slugSchema.optional(),
  /** Full-text search query (websearch syntax: quotes, OR, -). */
  q: z.string().trim().min(2).max(200).optional(),
});
 
export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;
 
// ----------------------------------------------------------------
// Shared error formatting
// ----------------------------------------------------------------
 
/** Stable, version-agnostic issue shape for 422 responses. */
export const formatZodIssues = (error: z.ZodError) =>
  error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
 