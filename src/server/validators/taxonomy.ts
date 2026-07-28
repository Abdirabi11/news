import { z } from "zod";
import { localeSchema, slugSchema } from "@/server/validators/article";
 
// ----------------------------------------------------------------
// Categories
// ----------------------------------------------------------------
 
export const categoryTranslationInputSchema = z.object({
  locale: localeSchema,
  name: z.string().min(2).max(100),
  slug: slugSchema,
  description: z.string().max(1000).optional(),
});
 
const uniqueLocales = <T extends { locale: string }>(
  items: T[],
  ctx: z.RefinementCtx,
) => {
  const locales = items.map((t) => t.locale);
  if (new Set(locales).size !== locales.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["translations"],
      message: "Duplicate locale in translations.",
    });
  }
};
 
export const createCategorySchema = z
  .object({
    parentId: z.string().cuid().optional(),
    sortOrder: z.number().int().min(0).default(0),
    translations: z.array(categoryTranslationInputSchema).min(1).max(3),
  })
  .superRefine((data, ctx) => uniqueLocales(data.translations, ctx));
 
export const updateCategorySchema = z
  .object({
    parentId: z.string().cuid().nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    /** Upserted by locale; omitted locales are untouched. */
    translations: z.array(categoryTranslationInputSchema).max(3).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.translations) uniqueLocales(data.translations, ctx);
  });
 
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
 
// ----------------------------------------------------------------
// Tags
// ----------------------------------------------------------------
 
export const tagTranslationInputSchema = z.object({
  locale: localeSchema,
  name: z.string().min(2).max(60),
  slug: slugSchema,
});
 
export const createTagSchema = z
  .object({
    translations: z.array(tagTranslationInputSchema).min(1).max(3),
  })
  .superRefine((data, ctx) => uniqueLocales(data.translations, ctx));
 
export const updateTagSchema = z
  .object({
    translations: z.array(tagTranslationInputSchema).max(3).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.translations) uniqueLocales(data.translations, ctx);
  });
 
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
