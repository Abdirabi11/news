import { PrismaClient, Locale, Role, ArticleStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
 
const prisma = new PrismaClient();
 
// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
 
/** Build a minimal Tiptap JSON document from plain paragraphs. */
const tiptapDoc = (paragraphs: string[]) => ({
  type: "doc",
  content: paragraphs.map((text) => ({
    type: "paragraph",
    content: [{ type: "text", text }],
  })),
});
 
/** ~200 wpm, minimum 1 minute. */
const readingTime = (text: string) =>
  Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
 
/** Assemble the fields every ArticleTranslation needs from raw copy. */
const translation = (
  locale: Locale,
  slug: string,
  title: string,
  excerpt: string,
  paragraphs: string[],
) => {
  const contentText = paragraphs.join("\n\n");
  return {
    locale,
    slug,
    title,
    excerpt,
    content: tiptapDoc(paragraphs),
    contentText,
    readingTime: readingTime(contentText),
  };
};
 
// ---------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------
 
async function seedUsers() {
  const password = process.env.SEED_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);
 
  const users = [
    {
      email: "admin@newsroom.test",
      name: "Amina Yusuf",
      role: Role.ADMIN,
      authorSlug: "amina-yusuf",
    },
    {
      email: "editor@newsroom.test",
      name: "Omar Hassan",
      role: Role.EDITOR,
      authorSlug: "omar-hassan",
    },
    {
      email: "author@newsroom.test",
      name: "Layla Ahmed",
      role: Role.AUTHOR,
      authorSlug: "layla-ahmed",
    },
  ];
 
  const created: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: { ...u, passwordHash, emailVerified: new Date() },
    });
    created[u.role] = user.id;
    console.log(`  user: ${u.email} (${u.role})`);
  }
  return created;
}
 
async function seedCategories() {
  // [en, so, ar] triples: { name, slug }
  const categories: {
    key: string;
    t: Record<Locale, { name: string; slug: string }>;
  }[] = [
    {
      key: "politics",
      t: {
        en: { name: "Politics", slug: "politics" },
        so: { name: "Siyaasadda", slug: "siyaasadda" },
        ar: { name: "السياسة", slug: "alsiyasa" },
      },
    },
    {
      key: "technology",
      t: {
        en: { name: "Technology", slug: "technology" },
        so: { name: "Teknoolajiyada", slug: "teknoolajiyada" },
        ar: { name: "التكنولوجيا", slug: "altiknulujia" },
      },
    },
    {
      key: "local-news",
      t: {
        en: { name: "Local News", slug: "local-news" },
        so: { name: "Wararka Deegaanka", slug: "wararka-deegaanka" },
        ar: { name: "الأخبار المحلية", slug: "alakhbar-almahalia" },
      },
    },
  ];
 
  const ids: Record<string, string> = {};
  for (const [order, cat] of categories.entries()) {
    // Idempotency: look the category up via its unique English slug.
    const existing = await prisma.categoryTranslation.findUnique({
      where: { slug_locale: { slug: cat.t.en.slug, locale: Locale.en } },
      select: { categoryId: true },
    });
 
    if (existing) {
      ids[cat.key] = existing.categoryId;
      console.log(`  category exists: ${cat.t.en.name}`);
      continue;
    }
 
    const category = await prisma.category.create({
      data: {
        sortOrder: order,
        translations: {
          create: (Object.keys(cat.t) as Locale[]).map((locale) => ({
            locale,
            ...cat.t[locale],
          })),
        },
      },
    });
    ids[cat.key] = category.id;
    console.log(`  category: ${cat.t.en.name} (en/so/ar)`);
  }
  return ids;
}
 
async function seedTags() {
  const existing = await prisma.tagTranslation.findUnique({
    where: { slug_locale: { slug: "digital-id", locale: Locale.en } },
    select: { tagId: true },
  });
  if (existing) {
    console.log("  tag exists: Digital ID");
    return { digitalId: existing.tagId };
  }
 
  const tag = await prisma.tag.create({
    data: {
      translations: {
        create: [
          { locale: Locale.en, name: "Digital ID", slug: "digital-id" },
          { locale: Locale.so, name: "Aqoonsiga Dijitaalka", slug: "aqoonsiga-dijitaalka" },
          { locale: Locale.ar, name: "الهوية الرقمية", slug: "alhawia-alraqmia" },
        ],
      },
    },
  });
  console.log("  tag: Digital ID (en/so/ar)");
  return { digitalId: tag.id };
}
 
async function seedArticles(
  userIds: Record<string, string>,
  categoryIds: Record<string, string>,
  tagIds: Record<string, string>,
) {
  // ------- Article A: fully translated (en / so / ar) -------
  const articleASlug = "somalia-launches-national-digital-id-program";
  const existingA = await prisma.articleTranslation.findUnique({
    where: { slug_locale: { slug: articleASlug, locale: Locale.en } },
  });
 
  if (!existingA) {
    await prisma.article.create({
      data: {
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date("2026-07-10T08:00:00Z"),
        isFeatured: true,
        authorId: userIds[Role.AUTHOR],
        editorId: userIds[Role.EDITOR],
        categoryId: categoryIds["technology"],
        tags: { create: [{ tagId: tagIds.digitalId }] },
        translations: {
          create: [
            translation(
              Locale.en,
              articleASlug,
              "Somalia Launches National Digital ID Program",
              "The new biometric identity system aims to reach ten million citizens within three years.",
              [
                "The federal government officially launched its national digital identity program on Thursday, marking a major milestone in the country's digital transformation agenda.",
                "Officials said the biometric system will allow citizens to access banking, telecommunications, and government services with a single verified identity, targeting ten million registrations within three years.",
                "Technology partners emphasized that data protection safeguards were built into the platform from the outset, with an independent oversight board reviewing access requests.",
              ],
            ),
            translation(
              Locale.so,
              "soomaaliya-oo-billowday-barnaamijka-aqoonsiga-dijitaalka",
              "Soomaaliya oo Billowday Barnaamijka Aqoonsiga Dijitaalka ee Qaranka",
              "Nidaamka cusub ee aqoonsiga ayaa lagu wadaa in uu gaaro toban milyan oo muwaadin saddex sano gudahood.",
              [
                "Dowladda federaalka ayaa Khamiistii si rasmi ah u billowday barnaamijka aqoonsiga dijitaalka ee qaranka, taasoo tallaabo weyn ka ah ajandaha isbeddelka dijitaalka ee dalka.",
                "Saraakiishu waxay sheegeen in nidaamka bayoomeetriga uu muwaadiniinta u oggolaan doono inay helaan adeegyada bangiyada, isgaarsiinta, iyo dowladda iyagoo isticmaalaya hal aqoonsi oo la xaqiijiyay.",
                "Shirkadaha teknoolajiyada ayaa xoogga saaray in ilaalinta xogta laga dhisay nidaamka bilowgiisa, iyadoo guddi madax-bannaan uu kormeerayo codsiyada helitaanka xogta.",
              ],
            ),
            translation(
              Locale.ar,
              "alsumal-tutliq-barnamaj-alhawia-alraqmia",
              "الصومال يطلق برنامج الهوية الرقمية الوطنية",
              "يهدف نظام الهوية البيومترية الجديد إلى الوصول إلى عشرة ملايين مواطن خلال ثلاث سنوات.",
              [
                "أطلقت الحكومة الفيدرالية رسمياً يوم الخميس برنامج الهوية الرقمية الوطنية، في خطوة تمثل إنجازاً كبيراً في أجندة التحول الرقمي للبلاد.",
                "وقال المسؤولون إن النظام البيومتري سيتيح للمواطنين الوصول إلى الخدمات المصرفية والاتصالات والخدمات الحكومية بهوية واحدة موثقة، مستهدفاً تسجيل عشرة ملايين مواطن خلال ثلاث سنوات.",
                "وأكد شركاء التكنولوجيا أن ضمانات حماية البيانات بُنيت في المنصة منذ البداية، مع وجود مجلس رقابة مستقل يراجع طلبات الوصول إلى البيانات.",
              ],
            ),
          ],
        },
      },
    });
    console.log("  article A: Digital ID (fully translated en/so/ar)");
  } else {
    console.log("  article A exists, skipping");
  }
 
  // ------- Article B: partially translated (en / so only) -------
  const articleBSlug = "city-council-approves-new-transit-plan";
  const existingB = await prisma.articleTranslation.findUnique({
    where: { slug_locale: { slug: articleBSlug, locale: Locale.en } },
  });
 
  if (!existingB) {
    await prisma.article.create({
      data: {
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date("2026-07-12T14:30:00Z"),
        authorId: userIds[Role.AUTHOR],
        categoryId: categoryIds["local-news"],
        translations: {
          create: [
            translation(
              Locale.en,
              articleBSlug,
              "City Council Approves New Transit Plan",
              "The plan adds three bus rapid transit corridors and extends evening service hours.",
              [
                "The city council voted eight to three on Friday to approve a comprehensive transit expansion plan, ending months of public consultation and debate.",
                "The plan adds three bus rapid transit corridors connecting outlying districts to the city center and extends evening service until midnight on weekdays.",
                "Construction on the first corridor is expected to begin early next year, with funding drawn from a combination of municipal bonds and federal infrastructure grants.",
              ],
            ),
            translation(
              Locale.so,
              "golaha-magaalada-oo-ansixiyay-qorshe-gaadiid",
              "Golaha Magaalada oo Ansixiyay Qorshe Cusub oo Gaadiidka Dadweynaha",
              "Qorshuhu wuxuu ku darayaa saddex waddo oo basas degdeg ah wuxuuna kordhinayaa saacadaha adeegga fiidkii.",
              [
                "Golaha magaaladu wuxuu Jimcihii u codeeyay siddeed iyo saddex si loo ansixiyo qorshe ballaaran oo lagu kordhinayo gaadiidka dadweynaha, kaasoo soo afjaray bilo ka mid ah wadatashi iyo dood dadweyne.",
                "Qorshuhu wuxuu ku darayaa saddex waddo oo basas degdeg ah oo isku xiraya degmooyinka fog-fog iyo bartamaha magaalada, wuxuuna kordhinayaa adeegga fiidkii ilaa saqda dhexe maalmaha shaqada.",
              ],
            ),
            // NOTE: no Arabic translation on purpose — Article B tests
            // partial-translation handling (hreflang alternates, locale
            // fallbacks, and listing queries must all tolerate this).
          ],
        },
      },
    });
    console.log("  article B: Transit Plan (partial: en/so, no ar)");
  } else {
    console.log("  article B exists, skipping");
  }
}
 
/** Smoke-test the tsvector trigger + GIN index from the FTS migration. */
async function verifyFullTextSearch() {
  const results = await prisma.$queryRaw<
    { title: string; locale: string; rank: number }[]
  >`
    SELECT title, locale::text AS locale,
           ts_rank("searchVector", q) AS rank
    FROM "article_translations",
         websearch_to_tsquery('english', 'digital identity') AS q
    WHERE locale = 'en' AND "searchVector" @@ q
    ORDER BY rank DESC
    LIMIT 5;
  `;
 
  if (results.length === 0) {
    console.warn(
      "  ⚠ full-text search returned no rows — did the FTS migration run?",
    );
  } else {
    console.log("  ✓ full-text search working:");
    for (const r of results) {
      console.log(`    [${r.locale}] ${r.title} (rank ${r.rank.toFixed(4)})`);
    }
  }
}
 
// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
 
async function main() {
  console.log("Seeding users...");
  const userIds = await seedUsers();
 
  console.log("Seeding categories...");
  const categoryIds = await seedCategories();
 
  console.log("Seeding tags...");
  const tagIds = await seedTags();
 
  console.log("Seeding articles...");
  await seedArticles(userIds, categoryIds, tagIds);
 
  console.log("Verifying full-text search...");
  await verifyFullTextSearch();
 
  console.log("Seed complete.");
}
 
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
 
