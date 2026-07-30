import { PrismaClient, Locale, Role, ArticleStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
 
const prisma = new PrismaClient();
 
const tiptapDoc = (paragraphs: string[]) => ({
  type: "doc",
  content: paragraphs.map((text) => ({
    type: "paragraph",
    content: [{ type: "text", text }],
  })),
});
 
const readingTime = (t: string) =>
  Math.max(1, Math.round(t.split(/\s+/).filter(Boolean).length / 200));
 
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
 
let seed = 42;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)];
 
const UNSPLASH = [
  "photo-1477959858617-67f85cf4f1df",
  "photo-1518770660439-4636190af475",
  "photo-1509440159596-0249088772ff",
  "photo-1543393716-375f47996a77",
  "photo-1451187580459-43490279c0fa",
  "photo-1476514525535-07fb3b4ae5f1",
  "photo-1529107386315-e1a2ed48a620",
  "photo-1460925895917-afdab827c52f",
  "photo-1504711434969-e33886168f5c",
  "photo-1523995462485-3d171b5c8fa9",
  "photo-1495020689067-958852a7765e",
  "photo-1550751827-4bd374c3f58b",
].map((id) => `https://images.unsplash.com/${id}?w=1200&q=80`);
 
const LEDE =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
const BODY = [
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem.",
];
 
// 30 headlines per category, BBC/Al Jazeera register.
const HEADLINES: Record<string, string[]> = {
  politics: [
    "City Council Approves Sweeping Plan to Green the Riverfront District",
    "Regional Leaders Meet to Draft Shared Water Accord",
    "New Transparency Rules Take Effect for Campaign Donations",
    "Budget Talks Stall Over Transit Funding Priorities",
    "Voters Back Measure to Expand Public Park Access",
    "Coalition Unveils Ten-Year Housing Affordability Roadmap",
    "Mayor Signs Order Protecting Historic Waterfront Warehouses",
    "Provincial Assembly Debates Renewable Energy Targets",
    "Independent Commission Recommends Sweeping Electoral Reforms",
    "Cross-Border Trade Pact Enters Final Round of Talks",
    "Opposition Demands Inquiry Into Delayed Infrastructure Funds",
    "Parliament Passes Landmark Data Privacy Legislation",
    "Local Elections Set to Reshape the Regional Balance of Power",
    "Government Pledges to Halve Emissions Within a Decade",
    "Diplomats Reach Tentative Ceasefire After Marathon Negotiations",
    "New Cabinet Sworn In Amid Calls for Faster Reform",
    "Court Ruling Forces Rewrite of Municipal Zoning Code",
    "Refugee Resettlement Program Wins Bipartisan Support",
    "Anti-Corruption Watchdog Publishes Long-Awaited Audit",
    "Regional Bloc Signs Accord to Ease Movement Across Borders",
    "Public Sector Unions Reach Deal to Avert Strike",
    "Lawmakers Clash Over Proposed Fuel Subsidy Cuts",
    "Referendum on Devolved Powers Set for the Autumn",
    "Minister Resigns Following Procurement Controversy",
    "New Legislation Aims to Curb Foreign Influence in Elections",
    "City Extends Rent Freeze as Housing Pressures Mount",
    "Peace Talks Resume as Both Sides Signal Compromise",
    "Census Data Prompts Redrawing of Electoral Districts",
    "Assembly Approves Record Investment in Public Health",
    "Leaders Pledge Unified Response to Regional Drought Crisis",
  ],
  technology: [
    "The Quiet Rise of On-Device AI in Everyday Newsrooms",
    "Open Data Portal Opens the City's Books to Anyone",
    "Local Startup Turns Food Waste Into Compostable Packaging",
    "Researchers Map the City With Low-Cost Air Sensors",
    "A New Standard Promises Faster, Greener Data Centres",
    "Community Mesh Network Brings Free Wi-Fi to the Old Quarter",
    "Universities Partner on an Open-Source Translation Model",
    "How a Small Team Rebuilt the Transit Maps From Scratch",
    "Battery Recycling Plant Breaks Ground Downtown",
    "The Case for Boring, Reliable Civic Software",
    "Regulators Weigh New Rules for Facial Recognition",
    "Chipmakers Race to Meet Surging Demand for AI Hardware",
    "Farmers Turn to Sensors and Drones to Weather the Dry Season",
    "Hospitals Trial AI Tools to Cut Waiting Times",
    "Cybersecurity Agency Warns of Rise in Ransomware Attacks",
    "Startups Bet on Green Hydrogen to Power Heavy Industry",
    "The Repair Café Movement Takes On Electronic Waste",
    "New Undersea Cable Promises to Slash Latency for the Region",
    "Digital ID Rollout Raises Questions Over Privacy Safeguards",
    "Researchers Unveil a Cheaper Path to Desalination",
    "Satellite Startups Compete to Connect the Unconnected",
    "How Open Hardware Is Reshaping Classroom Science",
    "Grid Operators Turn to Software to Balance Renewable Power",
    "A Homegrown App Aims to Make Public Transit Predictable",
    "Quantum Computing Lab Opens Its Doors to Local Students",
    "The Fight to Keep the Internet Affordable for All",
    "Electric Bus Fleet Passes One Million Kilometres",
    "Developers Rally Around a New Accessibility Standard",
    "Smart Meters Promise Savings, but Trust Remains a Hurdle",
    "The Startups Trying to Make Recycling Actually Work",
  ],
  "local-news": [
    "A Neighbourhood Bakery Becomes the Heart of the Morning Commute",
    "Volunteers Restore the Old Coastal Rail Trail in a Single Weekend",
    "Farmers Market Doubles in Size After a Record Season",
    "The Library's Late-Night Study Hall Draws Growing Crowds",
    "A Mural Project Brings Colour to the Underpass",
    "Local Choir Prepares for Its First International Tour",
    "New Bike Lanes Reshape the Commute on Fifth Avenue",
    "Beekeepers Report the Best Honey Harvest in Years",
    "A Community Fridge Keeps the Corner Fed Through Winter",
    "Weekend Cleanup Pulls a Tonne of Litter From the Creek",
    "Historic Cinema Reopens After a Decade of Restoration",
    "School Garden Programme Expands to a Dozen Campuses",
    "Firefighters Rescue Family Pets From Riverside Blaze",
    "Night Market Returns to the Waterfront After Two Years",
    "Elderly Residents Find Community at the New Day Centre",
    "Record Turnout as Thousands Join the Annual River Swim",
    "Local Hospital Welcomes Its First Cohort of Trainee Nurses",
    "Corner Shop Owner Marks Forty Years Serving the Street",
    "Youth Football League Kicks Off With a Record Sign-Up",
    "Heritage Trust Saves the Last Working Windmill",
    "A Pop-Up Clinic Brings Dental Care to Underserved Blocks",
    "Neighbours Turn a Vacant Lot Into a Thriving Allotment",
    "The Ferry Service Returns After Years of Campaigning",
    "Local Author's Debut Novel Tops the Regional Bestseller List",
    "Rescue Centre Celebrates Its Thousandth Adoption",
    "Street Festival Draws the Largest Crowd in Its History",
    "Community Radio Station Marks a Decade on the Air",
    "New Playground Opens to Cheers From Local Families",
    "Fishermen and Scientists Team Up to Track the Bay's Health",
    "Volunteers Plant Ten Thousand Trees Along the Ridge",
  ],
};
 
const CATEGORIES = [
  { key: "politics", en: "Politics", so: "Siyaasadda", ar: "السياسة", slugSo: "siyaasadda", slugAr: "alsiyasa" },
  { key: "technology", en: "Technology", so: "Teknoolajiyada", ar: "التكنولوجيا", slugSo: "teknoolajiyada", slugAr: "altiknulujia" },
  { key: "local-news", en: "Local News", so: "Wararka Deegaanka", ar: "الأخبار المحلية", slugSo: "wararka-deegaanka", slugAr: "alakhbar-almahalia" },
];
 
const AUTHORS = [
  { email: "admin@newsroom.test", name: "Amina Yusuf", slug: "amina-yusuf", role: Role.ADMIN },
  { email: "editor@newsroom.test", name: "Omar Hassan", slug: "omar-hassan", role: Role.EDITOR },
  { email: "author@newsroom.test", name: "Layla Ahmed", slug: "layla-ahmed", role: Role.AUTHOR },
];
 
async function wipe() {
  await prisma.articleTag.deleteMany();
  await prisma.article.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.media.deleteMany();
  console.log("  cleared articles / categories / tags / media");
}
 
async function seedAuthors() {
  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD ?? "ChangeMe123!", 12);
  const ids: Record<string, string> = {};
  for (const a of AUTHORS) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { role: a.role, name: a.name, authorSlug: a.slug },
      create: {
        email: a.email,
        name: a.name,
        authorSlug: a.slug,
        role: a.role,
        passwordHash,
        emailVerified: new Date(),
        bio: `${a.name} writes for Newsroom.`,
      },
    });
    ids[a.email] = user.id;
    console.log(`  author: ${a.name} (${a.role})`);
  }
  return ids;
}
 
async function seedCategories() {
  const ids: Record<string, string> = {};
  for (const [order, c] of CATEGORIES.entries()) {
    const category = await prisma.category.create({
      data: {
        sortOrder: order,
        translations: {
          create: [
            { locale: Locale.en, name: c.en, slug: c.key },
            { locale: Locale.so, name: c.so, slug: c.slugSo },
            { locale: Locale.ar, name: c.ar, slug: c.slugAr },
          ],
        },
      },
    });
    ids[c.key] = category.id;
    console.log(`  category: ${c.en} (en/so/ar)`);
  }
  return ids;
}
 
async function seedArticles(
  authorIds: Record<string, string>,
  categoryIds: Record<string, string>,
) {
  const emails = AUTHORS.map((a) => a.email);
  const now = Date.now();
  let n = 0;
 
  for (const cat of CATEGORIES) {
    for (let i = 0; i < 30; i++) {
      const title = HEADLINES[cat.key]?.[i] || `${cat.en} Article ${i + 1}`;
      const baseSlug = slugify(title);
      const publishedAt = new Date(now - n * 14 * 3_600_000);
      const status =
        n % 13 === 5
          ? ArticleStatus.DRAFT
          : n % 17 === 7
            ? ArticleStatus.SCHEDULED
            : ArticleStatus.PUBLISHED;
 
      const paragraphs = [LEDE, pick(BODY), pick(BODY), pick(BODY)];
      const contentText = paragraphs.join("\n\n");
      const excerpt = LEDE.slice(0, 140);
      const authorEmail = pick(emails);
 
      // 1. Create the Media record FIRST
      const coverMedia = await prisma.media.create({
        data: {
          uploaderId: authorIds[authorEmail],
          storageKey: `seed/${cat.key}-${i}-${baseSlug}`,
          url: pick(UNSPLASH),
          mimeType: "image/jpeg",
          sizeBytes: 500_000,
          width: 1200,
          height: 750,
          altText: title,
          processed: true,
        },
      });

      // 2. Attach the Media ID to the Article
      await prisma.article.create({
        data: {
          status,
          publishedAt: status === ArticleStatus.PUBLISHED ? publishedAt : null,
          scheduledFor:
            status === ArticleStatus.SCHEDULED
              ? new Date(now + (n + 1) * 6 * 3_600_000)
              : null,
          isFeatured: n === 0, 
          isBreaking: n % 11 === 3,
          authorId: authorIds[authorEmail],
          categoryId: categoryIds[cat.key],
          coverImageId: coverMedia.id, // <-- THE FIX IS HERE
          translations: {
            create: [
              {
                locale: Locale.en,
                title,
                slug: baseSlug,
                excerpt,
                content: tiptapDoc(paragraphs),
                contentText,
                readingTime: readingTime(contentText),
              },
              {
                locale: Locale.so,
                title: `${title} (SO)`,
                slug: `${baseSlug}-so`,
                excerpt,
                content: tiptapDoc([LEDE, pick(BODY)]),
                contentText: `${LEDE} ${pick(BODY)}`,
                readingTime: 2,
              },
              {
                locale: Locale.ar,
                title: `${title} (AR)`,
                slug: `${baseSlug}-ar`,
                excerpt,
                content: tiptapDoc([LEDE, pick(BODY)]),
                contentText: `${LEDE} ${pick(BODY)}`,
                readingTime: 2,
              },
            ],
          },
        },
      });
      n++;
    }
  }
  console.log(`  articles: ${n} created across 3 categories`);
}
 
async function main() {
  console.log("Seeding…");
  await wipe();
  const authorIds = await seedAuthors();
  const categoryIds = await seedCategories();
  await seedArticles(authorIds, categoryIds);
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
 