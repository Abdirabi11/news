import { Locale } from "@prisma/client";
import { prisma } from "@/server/db/client";

export interface NavSection {
  name: string;
  slug: string;
}

/** Top-level categories, in display order, for the header/footer nav. */
export async function navSections(locale: Locale): Promise<NavSection[]> {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    select: {
      translations: {
        where: { locale },
        select: { name: true, slug: true },
      },
    },
  });

  return categories
    .map((c) => c.translations[0])
    .filter((t): t is { name: string; slug: string } => Boolean(t));
}