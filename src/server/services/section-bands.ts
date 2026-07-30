import { Locale } from "@prisma/client";
import { navSections } from "@/server/services/navigation";
import {
  fetchArticleCards,
  type ArticleCard,
} from "@/server/services/article-cards";

export interface SectionBandData {
  slug: string;
  name: string;
  cards: ArticleCard[];
}

export async function sectionBands(
  locale: Locale,
  opts: { bandCount: number; perBand: number },
): Promise<SectionBandData[]> {
  const { bandCount, perBand } = opts;
  const sections = await navSections(locale);

  const bands = await Promise.all(
    sections.map(async (section) => {
      const { cards } = await fetchArticleCards({
        locale,
        where: { categoryId: section.id },
        page: 1,
        pageSize: perBand,
      });
      return { slug: section.slug, name: section.name, cards };
    }),
  );

  return bands.filter((b) => b.cards.length > 0).slice(0, bandCount);
}