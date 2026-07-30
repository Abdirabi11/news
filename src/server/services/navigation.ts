import { Locale } from "@prisma/client";
import { prisma } from "@/server/db/client";

export interface NavSection {
  id: string;
  name: string;
  slug: string;
}

export async function navSections(locale: Locale): Promise<NavSection[]> {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      translations: {
        where: { locale },
        select: { name: true, slug: true },
      },
    },
  });

  return categories
    .map((c) => {
      const t = c.translations[0];
      return t ? { id: c.id, name: t.name, slug: t.slug } : null;
    })
    .filter((s): s is NavSection => s !== null);
}