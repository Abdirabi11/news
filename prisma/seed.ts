/**
 * Database seed — real Horn of Africa news, fully trilingual, 48 articles.
 *
 * 48 hand-written articles (12 per category — politics, technology,
 * local-news, international) each with a complete English, Somali,
 * and Arabic headline + excerpt + BODY (4-6 paragraphs). Every
 * article is distinct; there is no copy-looping.
 *
 * Matches the Phase 1 hub-and-translation schema. contentText is
 * populated per locale for the tsvector trigger. Unsplash covers,
 * staggered publish dates, 3 authors, mostly PUBLISHED.
 *
 * DB write order per article: create the Media row FIRST, then pass
 * coverImageId into prisma.article.create — never a nested
 * `coverImage: { create: ... }`, which this schema does not support.
 *
 * Run:  npx prisma db seed
 * (prisma.config.ts → migrations.seed: "tsx prisma/seed.ts")
 */
import { PrismaClient, Locale, Role, ArticleStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

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
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

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
  "photo-1526304640581-d334cdbbf45e",
  "photo-1500835556837-99ac94a94552",
  "photo-1557804506-669a67965ba0",
  "photo-1454165804606-c3d57bc86b40",
].map((id) => `https://images.unsplash.com/${id}?w=1200&q=80`);

// ---------------------------------------------------------------
// Categories & authors
// ---------------------------------------------------------------

const CATEGORIES = [
  { key: "politics", en: "Politics", so: "Siyaasadda", ar: "السياسة", slugSo: "siyaasadda", slugAr: "alsiyasa" },
  { key: "technology", en: "Technology", so: "Teknoolajiyada", ar: "التكنولوجيا", slugSo: "teknoolajiyada", slugAr: "altiknulujia" },
  { key: "local-news", en: "Local News", so: "Wararka Deegaanka", ar: "الأخبار المحلية", slugSo: "wararka-deegaanka", slugAr: "alakhbar-almahalia" },
  { key: "international", en: "International", so: "Caalamka", ar: "الدولية", slugSo: "caalamka", slugAr: "aldawlia" },
];

const AUTHORS = [
  { email: "amina@newsroom.test", name: "Amina Yusuf", slug: "amina-yusuf", role: Role.ADMIN },
  { email: "omar@newsroom.test", name: "Omar Hassan", slug: "omar-hassan", role: Role.EDITOR },
  { email: "layla@newsroom.test", name: "Layla Ahmed", slug: "layla-ahmed", role: Role.AUTHOR },
];

// ---------------------------------------------------------------
// The 48 source articles (fully trilingual)
// ---------------------------------------------------------------

interface LocalizedContent {
  title: string;
  excerpt: string;
  body: string[];
}
interface SourceArticle {
  categoryKey: string;
  en: LocalizedContent;
  so: LocalizedContent;
  ar: LocalizedContent;
}

const ARTICLES: SourceArticle[] = [
  // ============ POLITICS 1 ============
  {
    categoryKey: "politics",
    en: {
      title: "Somali Government and Opposition Present Rival Election Models as Talks Enter Critical Phase",
      excerpt:
        "Negotiations between the Federal Government and the opposition-aligned Future Council have entered a decisive phase in Mogadishu, with rival camps tabling competing blueprints for direct elections.",
      body: [
        "Political talks between Somalia's Federal Government and opposition groups entered a more critical phase in Mogadishu this month, with discussions centring on how to break a long-running deadlock over the country's electoral model. The sessions, facilitated by the United Nations Transitional Assistance Mission in Somalia, were attended by representatives of the Turkish, US, British and European Union missions, underscoring the weight international partners place on a negotiated settlement.",
        "At the heart of the dispute are competing visions for how Somalia should vote. The Future Council — a coalition that includes the Puntland and Jubaland administrations alongside other opposition figures — has put forward a transitional direct-elections framework, while a separate bloc has proposed a one-person, one-vote system built around an independent federal electoral commission, a multiparty structure, and a mandatory 30 percent quota for women in parliament.",
        "President Hassan Sheikh Mohamud has pressed for universal suffrage to replace the decades-old clan-based model, but the push has deepened mistrust with Puntland and Jubaland, both of which have rejected the constitutional changes as rushed and insufficiently consultative. The two states declined to join earlier sessions hosted abroad, questioning the neutrality of the mediation.",
        "The stakes are considerable. Earlier rounds have collapsed into recrimination, and violent clashes in Mogadishu earlier this year left more than a dozen people dead. While officials on both sides have spoken of a more positive atmosphere in recent meetings, a comprehensive breakthrough remains elusive, and the electoral timetable published by the national commission has itself become a point of contention.",
        "Diplomats close to the talks say a partial agreement — covering the timetable but deferring the thorniest questions of representation — is the most realistic near-term outcome. Even that, they caution, would require both sides to accept compromises neither has so far been willing to make in public.",
      ],
    },
    so: {
      title: "Dowladda Soomaaliya iyo Mucaaradka oo Soo Bandhigay Qaabab Kala Duwan oo Doorasho, Wadahadalladuna Gaadhaan Marxalad Muhiim ah",
      excerpt:
        "Wadahadallada u dhexeeya Dowladda Federaalka iyo Golaha Mustaqbalka ee mucaaradku waxay gaadheen marxalad go'aan ah magaalada Muqdisho, iyadoo dhinacyadu soo bandhigeen qorshayaal iska horimaad ah oo doorasho toos ah.",
      body: [
        "Wadahadallada siyaasadeed ee u dhexeeya Dowladda Federaalka Soomaaliya iyo kooxaha mucaaradka ayaa bishan gaadhay marxalad aad muhiim u ah magaalada Muqdisho, iyadoo doodaha lagu diirad saarayo sida looga bixi lahaa istaagga muddada dheer socday ee ku saabsan qaabka doorashada dalka. Kalfadhiyada, oo ay fududaysay Howlgalka Kaalmaynta Kala-guurka ee Qaramada Midoobay u qaabilsan Soomaaliya, waxaa ka soo qaybgalay wakiillo ka socda safaaradaha Turkiga, Maraykanka, Ingiriiska iyo Midowga Yurub, taasoo muujinaysa muhiimadda ay shurakada caalamigu siiyaan xal wadahadal.",
        "Xudunta khilaafka waxaa ah aragtiyo iska soo horjeeda oo ku saabsan sida Soomaaliya u codayn lahayd. Golaha Mustaqbalka — oo ah isbahaysi ay ku jiraan maamullada Puntland iyo Jubbaland oo ay weheliyaan shakhsiyaad kale oo mucaarad ah — waxa uu soo bandhigay qaab-dhismeed doorasho-toos ah oo kala-guur ah, halka koox kale ay soo jeediyeen nidaam qof-kii-cod-keliya oo ku dhisan guddi doorasho oo federaal ah oo madax-bannaan, qaab xisbi-badan, iyo saami boqolkiiba 30 oo qasab ah oo dumarku ka helaan baarlamaanka.",
        "Madaxweyne Xasan Sheekh Maxamuud ayaa ku adkaystay in cod-bixin guud lagu beddelo nidaamkii qabaa'ilka ee tobannaan sano jiray, laakiin dadaalkaasi wuxuu sii kordhiyay kalsooni-darrada u dhaxaysa Puntland iyo Jubbaland, kuwaas oo labaduba diiday isbeddellada dastuuriga ah iyagoo ku tilmaamay kuwo degdeg ah oo aan si ku filan looga wada tashan. Labada dowlad-goboleed waxay diideen inay ka soo qaybgalaan kalfadhiyadii hore ee dibadda lagu martigeliyay, iyagoo su'aal ka keenay dhexdhexaadnimada dhexdhexaadinta.",
        "Halista waa mid weyn. Wareegyadii hore waxay ku dhammaadeen isku eedayn, iyadoo iskahorimaadyo rabshado wata oo Muqdisho ka dhacay sanadkan ay ku dhinteen in ka badan laba-iyo-toban qof. In kasta oo saraakiisha labada dhinacba ay ka hadleen jawi ka wanaagsan kulannadii dhawaa, haddana horumar dhammaystiran wali lama gaadhin, jadwalka doorashada ee ay soo saartay guddida qaranku isaga ayaa noqday barta muran.",
        "Diblumaasiyiin u dhow wadahadallada ayaa sheegay in heshiis qayb ah — oo daboolaya jadwalka laakiin dib u dhigaya su'aalaha ugu adag ee wakiilnimada — uu yahay natiijada ugu macquulsan ee dhaw. Xitaa taas, waxay ka digeen, waxay u baahan tahay in labada dhinac ay aqbalaan wax-ka-beddello aan mid ka mid ah weli si guud u diyaar u ahayn.",
      ],
    },
    ar: {
      title: "الحكومة الصومالية والمعارضة تطرحان نماذج انتخابية متنافسة مع دخول المحادثات مرحلة حاسمة",
      excerpt:
        "دخلت المفاوضات بين الحكومة الاتحادية ومجلس المستقبل المعارض مرحلة حاسمة في مقديشو، حيث طرح كل طرف تصوراً منافساً لانتخابات مباشرة.",
      body: [
        "دخلت المحادثات السياسية بين الحكومة الاتحادية الصومالية وجماعات المعارضة مرحلة أكثر حسماً في مقديشو هذا الشهر، مع تركيز النقاشات على كيفية كسر الجمود المستمر منذ فترة طويلة حول النموذج الانتخابي للبلاد. وحضر الجلسات، التي يسّرتها بعثة الأمم المتحدة لتقديم المساعدة الانتقالية في الصومال، ممثلون عن البعثات التركية والأمريكية والبريطانية والاتحاد الأوروبي، مما يؤكد الأهمية التي يوليها الشركاء الدوليون للتوصل إلى تسوية تفاوضية.",
        "يكمن جوهر الخلاف في رؤى متنافسة لكيفية إجراء الانتخابات في الصومال. فقد طرح مجلس المستقبل — وهو تحالف يضم إدارتَي بونتلاند وجوبالاند إلى جانب شخصيات معارضة أخرى — إطاراً انتقالياً للانتخابات المباشرة، بينما اقترحت كتلة منفصلة نظام صوت واحد لكل شخص يقوم على لجنة انتخابية اتحادية مستقلة، وبنية متعددة الأحزاب، وحصة إلزامية للنساء في البرلمان تبلغ 30 في المئة.",
        "وقد ضغط الرئيس حسن شيخ محمود من أجل الاقتراع العام ليحل محل النموذج القبلي القائم منذ عقود، لكن هذا الدفع عمّق انعدام الثقة مع بونتلاند وجوبالاند، اللتين رفضتا التعديلات الدستورية باعتبارها متسرعة وغير قائمة على تشاور كافٍ. وامتنعت الولايتان عن الانضمام إلى الجلسات السابقة التي استُضيفت في الخارج، متشككتين في حياد الوساطة.",
        "والمخاطر كبيرة. فقد انهارت الجولات السابقة وسط تبادل الاتهامات، وأسفرت اشتباكات عنيفة في مقديشو في وقت سابق من هذا العام عن مقتل أكثر من اثني عشر شخصاً. ورغم حديث المسؤولين من الجانبين عن أجواء أكثر إيجابية في الاجتماعات الأخيرة، فإن اختراقاً شاملاً لا يزال بعيد المنال، بل إن الجدول الزمني الانتخابي الذي نشرته اللجنة الوطنية أصبح هو نفسه نقطة خلاف.",
        "ويقول دبلوماسيون مقربون من المحادثات إن اتفاقاً جزئياً — يغطي الجدول الزمني لكنه يؤجل أشد الأسئلة المتعلقة بالتمثيل تعقيداً — هو النتيجة الأكثر واقعية على المدى القريب. لكنهم يحذّرون من أن حتى ذلك يتطلب من الطرفين قبول تنازلات لم يُبدِ أي منهما بعد استعداداً علنياً لتقديمها.",
      ],
    },
  },

  // ============ POLITICS 2 ============
  {
    categoryKey: "politics",
    en: {
      title: "African Union Weighs Future of Somalia Peace Mission as Funding Crisis Deepens",
      excerpt:
        "A widening shortfall in international financing has thrown the future of the African Union's stabilisation mission in Somalia into doubt, with officials warning of possible collapse in 2027.",
      body: [
        "The African Union Support and Stabilisation Mission in Somalia, known as AUSSOM, is confronting a deepening financial crisis that African Union officials say could imperil its operations as early as next year. The mission, which comprises more than 12,000 personnel and formally began work at the start of 2025, depends heavily on international support to sustain both its logistics and its counterinsurgency role alongside Somali forces.",
        "The uncertainty intensified after a major donor informed the African Union that it would not finance the mission's UN logistical backbone beyond the end of 2026, and signalled it would oppose efforts in the Security Council to extend that funding. The position has been tied to demands that Somalia's leadership end its political infighting and cooperate more closely on governance and security.",
        "At an emergency meeting of the AU Peace and Security Council, member states openly questioned how long the continent could sustain such a costly operation. A UN official acknowledged that the approved logistics budget still required full financing, while analysts warned that without an alternative donor to bridge the gap, the mission could face operational collapse heading into 2027.",
        "The debate arrives at a fragile moment. AUSSOM remains central to holding the line against Al-Shabaab, and any abrupt drawdown risks ceding hard-won ground at a time when Somalia's federal politics are strained and its security transition is far from complete.",
        "Officials in Mogadishu have appealed for patience from donors, arguing that a premature funding cut would undo years of gains at the worst possible moment. For now, the mission continues to operate on a patchwork of short-term commitments that leave planners unable to budget more than a few months ahead.",
      ],
    },
    so: {
      title: "Midowga Afrika oo Ka Fikiraya Mustaqbalka Howlgalka Nabad-ilaalinta Soomaaliya iyadoo Dhibaatada Maalgelintu Sii Xumaanayso",
      excerpt:
        "Yaraansho ballaadhan oo ku yimid maalgelinta caalamiga ah ayaa shaki gelisay mustaqbalka howlgalka xasillinta ee Midowga Afrika ee Soomaaliya, iyadoo saraakiishu ka digeen burbur suurtogal ah 2027.",
      body: [
        "Howlgalka Midowga Afrika ee Taageerada iyo Xasillinta Soomaaliya, oo loo yaqaan AUSSOM, ayaa wajahaya dhibaato maaliyadeed oo sii xumaanaysa oo saraakiisha Midowga Afrika ay sheegeen inay khatar gelin karto hawlgalladiisa xitaa sanadka soo socda. Howlgalka, oo ka kooban in ka badan 12,000 oo shaqaale oo si rasmi ah u bilaabay shaqada bilowgii 2025, wuxuu si weyn ugu tiirsan yahay taageerada caalamiga ah si uu u sii wado saadka iyo doorkiisa la dagaallanka fallaagada oo uu la kaashado ciidamada Soomaaliya.",
        "Hubanti-la'aantu waxay sii kordhay ka dib markii deeq-bixiye weyn u sheegay Midowga Afrika inuusan maalgelin doonin tiirka saadka ee Qaramada Midoobay ee taageera howlgalka wixii ka dambeeya dhammaadka 2026, wuxuuna muujiyay inuu ka soo horjeedi doono dadaallada Golaha Ammaanka ee lagu kordhinayo maalgelintaas. Mawqifkan waxaa lagu xidhay dalabyo ah in hoggaanka Soomaaliya uu joojiyo isqabqabsiga siyaasadeed oo uu si dhow ula shaqeeyo maamulka iyo amniga.",
        "Kulan degdeg ah oo uu yeeshay Golaha Nabadda iyo Ammaanka ee Midowga Afrika, dowladaha xubnaha ka ah waxay si furan u su'aaleen muddada ay qaaraddu sii wadi karto howlgal sidan u qaali ah. Sarkaal ka tirsan Qaramada Midoobay ayaa qiray in miisaaniyadda saadka ee la ansixiyay ay wali u baahan tahay maalgelin buuxda, halka falanqeeyayaashu ay ka digeen in la'aanta deeq-bixiye kale oo buuxiya farqiga, howlgalku uu la kulmi karo burbur hawleed markii uu galo 2027.",
        "Dooddu waxay imanaysaa xilli jilicsan. AUSSOM waxay wali udub-dhexaad u tahay adkaynta xadka ka dhanka ah Al-Shabaab, oo ka-bixid kasta oo degdeg ah waxay khatar gelinaysaa dhul si adag loo helay xilli ay siyaasadda federaalka Soomaaliya cakiran tahay oo kala-guurka amnigeedu uu ka fog yahay dhammaystir.",
        "Saraakiisha Muqdisho ayaa ka baryay deeq-bixiyeyaasha samir, iyagoo ku doodaya in gooyn maalgelin oo hore ka dhici lahayd ay burinayso sanado horumar ah xilli ugu xumaan badan. Hadda, howlgalku wuxuu ku sii socdaa ballan-qaadyo gaaban oo isku dheellitiran oo aan u oggolayn qorsheeyayaasha inay miisaaniyeeyaan wax ka badan dhawr bilood mustaqbalka ah.",
      ],
    },
    ar: {
      title: "الاتحاد الأفريقي يبحث مستقبل بعثة السلام في الصومال مع تفاقم أزمة التمويل",
      excerpt:
        "ألقى عجز متزايد في التمويل الدولي بظلال من الشك على مستقبل بعثة الاستقرار التابعة للاتحاد الأفريقي في الصومال، مع تحذير المسؤولين من انهيار محتمل في 2027.",
      body: [
        "تواجه بعثة الاتحاد الأفريقي للدعم والاستقرار في الصومال، المعروفة باسم أوسوم، أزمة مالية متفاقمة يقول مسؤولو الاتحاد الأفريقي إنها قد تهدد عملياتها في وقت مبكر قد يكون العام المقبل. وتعتمد البعثة، التي تضم أكثر من 12,000 فرد وبدأت عملها رسمياً مطلع عام 2025، اعتماداً كبيراً على الدعم الدولي للحفاظ على لوجستياتها ودورها في مكافحة التمرد إلى جانب القوات الصومالية.",
        "وتصاعدت حالة عدم اليقين بعد أن أبلغ مانح رئيسي الاتحاد الأفريقي بأنه لن يموّل العمود الفقري اللوجستي التابع للأمم المتحدة الداعم للبعثة بعد نهاية عام 2026، وأشار إلى أنه سيعارض جهود مجلس الأمن لتمديد ذلك التمويل. وارتبط هذا الموقف بمطالب بأن تنهي القيادة الصومالية اقتتالها السياسي وأن تتعاون بشكل أوثق في شؤون الحكم والأمن.",
        "وفي اجتماع طارئ لمجلس السلم والأمن التابع للاتحاد الأفريقي، تساءلت الدول الأعضاء علناً عن المدة التي يمكن أن تتحمل فيها القارة عملية بهذه التكلفة. وأقرّ مسؤول أممي بأن ميزانية اللوجستيات المعتمدة لا تزال بحاجة إلى تمويل كامل، بينما حذّر محللون من أنه دون مانح بديل لسد الفجوة، قد تواجه البعثة انهياراً تشغيلياً مع دخول عام 2027.",
        "ويأتي هذا النقاش في لحظة هشة. فلا تزال أوسوم محورية في صد حركة الشباب، وأي انسحاب مفاجئ يهدد بالتخلي عن مكاسب تحققت بشق الأنفس في وقت تعاني فيه السياسة الاتحادية الصومالية من توتر ولا يزال انتقالها الأمني بعيداً عن الاكتمال.",
        "وناشد مسؤولون في مقديشو المانحين التحلي بالصبر، محذّرين من أن قطع التمويل قبل الأوان سيبدد سنوات من المكاسب في أسوأ وقت ممكن. وحالياً، تواصل البعثة العمل بمزيج من الالتزامات قصيرة الأجل لا تسمح للمخططين بوضع ميزانية تتجاوز بضعة أشهر مقبلة.",
      ],
    },
  },

  // ============ POLITICS 3 ============
  {
    categoryKey: "politics",
    en: {
      title: "Puntland and Federal Forces Trade Accusations as Tensions Rise in the North East",
      excerpt:
        "Officials in Puntland say they are closely monitoring what they describe as military manoeuvres by the federal government, the latest sign of strain between Mogadishu and a breakaway federal state.",
      body: [
        "Relations between Somalia's federal authorities and the north-eastern state of Puntland have grown increasingly tense, with regional officials accusing Mogadishu of military mobilisation and warning that they are monitoring developments closely. Puntland, one of the country's most established federal member states, has distanced itself from the federal government amid the broader constitutional standoff.",
        "The friction is part of a larger rupture. Puntland and Jubaland have both withdrawn cooperation from key federal processes, objecting to constitutional amendments they say were pushed through without adequate consultation. Both states are members of the opposition Future Council, and their leaders have repeatedly clashed with President Hassan Sheikh Mohamud over the direction of the political transition.",
        "A former prime minister has warned that Somalia risks sliding back into internal conflict as military postures harden and political dialogue falters. Such warnings carry weight in a country where disputes over federalism and power-sharing have repeatedly spilled into violence.",
        "Analysts caution that the standoff in the north-east is symptomatic of a wider structural problem: a federal system whose boundaries of authority remain contested. Until the constitutional questions are resolved, they argue, localised confrontations between federal and regional forces are likely to recur.",
        "Community elders in the border districts say they have begun quiet mediation efforts of their own, wary that a formal military escalation would be devastating for towns that have only recently begun to recover economically. Their appeals for restraint, so far, have gone largely unanswered by either capital.",
      ],
    },
    so: {
      title: "Ciidamada Puntland iyo kuwa Federaalka oo Isku Haya Eedeymo iyadoo Xiisaddu Sare u Kacayso Waqooyi-bari",
      excerpt:
        "Saraakiisha Puntland ayaa sheegay inay si dhow u dabagalayaan waxay ku tilmaameen dhaqdhaqaaq militari oo ay dowladda federaalku samaynayso, calaamada ugu dambaysay ee xiisadda Muqdisho iyo dowlad-goboleed ka go'ay.",
      body: [
        "Xiriirka u dhexeeya maamulka federaalka Soomaaliya iyo dowlad-goboleedka waqooyi-bari ee Puntland ayaa noqday mid si isa soo taraysa u xiisad badan, iyadoo saraakiisha gobolku ay ku eedaynayaan Muqdisho abaabul militari, waxayna ka digayaan inay si dhow u dabagalayaan horumarrada. Puntland, oo ka mid ah dowlad-goboleedyada ugu xasilloon dalka, ayaa iska fogaysay dowladda federaalka iyadoo ay socoto istaagga dastuuriga ah ee ballaadhan.",
        "Isku-dhaca waa qayb ka mid ah kala-go' weyn. Puntland iyo Jubbaland labaduba waxay ka baxeen iskaashiga geeddi-socodyada federaalka ee muhiimka ah, iyagoo ka soo horjeeda isbeddellada dastuuriga ah ee ay sheegeen in la ansixiyay iyadoon si ku filan looga wada tashan. Labada dowlad-goboleed waa xubno ka tirsan Golaha Mustaqbalka ee mucaaradka, hoggaamiyayaashooduna marar badan waxay kula dhaceen Madaxweyne Xasan Sheekh Maxamuud jihada kala-guurka siyaasadeed.",
        "Ra'iisul-wasaare hore ayaa ka digay in Soomaaliya ay khatar ugu jirto inay dib ugu noqoto colaad gudaha ah iyadoo jaangooyada militari ay sii adkaanayaan wadahadalka siyaasadduna uu liicayo. Digniinaha noocaas ah waxay culays ku leeyihiin dal ay khilaafyada federaalnimada iyo qaybsiga awoodda marar badan ku dhaceen rabshado.",
        "Falanqeeyayaashu waxay ka digayaan in istaagga waqooyi-bari uu calaamad u yahay dhibaato qaab-dhismeed oo ballaadhan: nidaam federaal ah oo xudduudaha awooddiisu ay wali muran yihiin. Ilaa la xalliyo su'aalaha dastuuriga ah, waxay ku doodayaan, iska-horimaadyo maxalli ah oo u dhexeeya ciidamada federaalka iyo kuwa gobolku waxay u badan tahay inay soo noqnoqdaan.",
        "Odayaasha dhulalka xuduudka ku yaal ayaa sheegay inay bilaabeen dadaallo dhexdhexaadin oo aamusan oo iyaga u gaar ah, iyagoo ka welwelsan in kor-u-qaadis militari oo rasmi ah uu wax weyn u dhimi lahaa magaalooyin dhawaan bilaabay inay dhaqaale ahaan soo kabtaan. Baryooyinkooda dulqaadka ah, ilaa hadda, si weyn looma jawaabin labada caasimadood midkoodna.",
      ],
    },
    ar: {
      title: "قوات بونتلاند والقوات الاتحادية تتبادلان الاتهامات مع تصاعد التوتر في الشمال الشرقي",
      excerpt:
        "يقول مسؤولون في بونتلاند إنهم يراقبون عن كثب ما يصفونه بمناورات عسكرية للحكومة الاتحادية، في أحدث مؤشر على التوتر بين مقديشو وولاية منشقّة.",
      body: [
        "ازدادت العلاقات توتراً بين السلطات الاتحادية الصومالية وولاية بونتلاند الواقعة في الشمال الشرقي، حيث يتهم مسؤولون إقليميون مقديشو بالتعبئة العسكرية ويحذّرون من أنهم يراقبون التطورات عن كثب. وقد نأت بونتلاند، إحدى أرسخ الولايات الأعضاء في البلاد، بنفسها عن الحكومة الاتحادية وسط المواجهة الدستورية الأوسع.",
        "ويأتي هذا الاحتكاك ضمن قطيعة أكبر. فقد سحبت كل من بونتلاند وجوبالاند تعاونهما من العمليات الاتحادية الرئيسية، اعتراضاً على تعديلات دستورية تقولان إنها مُرّرت دون تشاور كافٍ. والولايتان عضوان في مجلس المستقبل المعارض، وقد اصطدم زعيماهما مراراً بالرئيس حسن شيخ محمود حول اتجاه الانتقال السياسي.",
        "وحذّر رئيس وزراء سابق من أن الصومال يخاطر بالانزلاق مجدداً إلى صراع داخلي مع تصلّب المواقف العسكرية وتعثّر الحوار السياسي. وتحمل هذه التحذيرات وزناً في بلد انزلقت فيه الخلافات حول الفيدرالية وتقاسم السلطة مراراً إلى العنف.",
        "ويحذّر المحللون من أن المواجهة في الشمال الشرقي عَرَضٌ لمشكلة بنيوية أوسع: نظام اتحادي لا تزال حدود سلطته محل نزاع. وحتى تُحل المسائل الدستورية، كما يرون، فمن المرجح أن تتكرر المواجهات المحلية بين القوات الاتحادية والإقليمية.",
        "ويقول شيوخ المجتمعات في المناطق الحدودية إنهم بدأوا جهود وساطة هادئة خاصة بهم، خشية أن يكون أي تصعيد عسكري رسمي كارثياً على بلدات بدأت للتو التعافي اقتصادياً. ونداءاتهم بضبط النفس لم تلقَ حتى الآن استجابة تُذكر من أي من العاصمتين.",
      ],
    },
  },

  // ============ POLITICS 4 ============
  {
    categoryKey: "politics",
    en: {
      title: "Cabinet Reshuffle Puts Focus on Economic Ministries as Government Faces Pressure to Deliver",
      excerpt:
        "President Hassan Sheikh Mohamud has reshuffled several economic and finance portfolios in a move officials describe as an effort to sharpen delivery on debt relief commitments and public financial management.",
      body: [
        "President Hassan Sheikh Mohamud has carried out a reshuffle of several economic and finance-related cabinet portfolios, a move his office described as an effort to sharpen the government's delivery on debt relief commitments and public financial management reforms. The changes affect ministries directly involved in Somalia's ongoing engagement with international financial institutions.",
        "The reshuffle comes as Somalia continues efforts to complete a multi-year debt relief process with the International Monetary Fund and World Bank, a process officials say has already unlocked meaningful fiscal space but requires sustained reform momentum to fully realise. Analysts note that donor confidence hinges heavily on visible continuity in economic management.",
        "New appointees have pledged to prioritise domestic revenue mobilisation, an area where Somalia has historically lagged regional peers, as well as strengthening public procurement oversight. Business groups in Mogadishu have cautiously welcomed the changes, though some warned that frequent turnover in key ministries can disrupt long-term planning.",
        "Opposition figures were quick to characterise the reshuffle as evidence of internal disagreements within the ruling coalition rather than a genuine reform push, a charge the presidency rejected. Political analysts say cabinet changes of this kind are often as much about managing coalition politics as they are about policy substance.",
      ],
    },
    so: {
      title: "Wax-ka-beddelka Golaha Wasiirrada oo Diirad Saaraya Wasaaradaha Dhaqaalaha iyadoo Dowladda Cadaadis Wax-soo-saar la Saarayo",
      excerpt:
        "Madaxweyne Xasan Sheekh Maxamuud ayaa wax ka beddelay dhowr xilal oo dhaqaale iyo maaliyadeed, tallaabo saraakiishu ku tilmaameen dadaal lagu dardarayo bixinta ballanqaadyada dejinta deynta iyo maamulka maaliyadda dadweynaha.",
      body: [
        "Madaxweyne Xasan Sheekh Maxamuud ayaa sameeyay wax-ka-beddel ku saabsan dhowr xilal oo golaha wasiirrada ah oo la xidhiidha dhaqaalaha iyo maaliyadda, tallaabo xafiiskiisu ku tilmaamay dadaal lagu dardarinayo bixinta dowladda ee ballanqaadyada dejinta deynta iyo dib-u-habaynta maamulka maaliyadda dadweynaha. Isbeddelladu waxay saameeyaan wasaaradaha si toos ah ugu lug leh la-kaashiga socda ee Soomaaliya la leedahay hay'adaha maaliyadeed ee caalamiga ah.",
        "Wax-ka-beddelku wuxuu imanayaa iyadoo Soomaaliya ay sii wadeyso dadaallada lagu dhammaynayo geeddi-socodka dejinta deynta ee sanado badan socday ee ay la leedahay Sanduuqa Caalamiga ah ee Lacagta iyo Bangiga Adduunka, geeddi-socod saraakiishu sheegeen inuu horeba u furay meel-marin maaliyadeed oo la taaban karo laakiin uu u baahan yahay socod dib-u-habayn oo joogto ah si loo dhammaystiro. Falanqeeyayaashu waxay xusuu in kalsoonida deeq-bixiyeyaashu ay si weyn ku xidhan tahay sii-socodka la arki karo ee maareynta dhaqaalaha.",
        "Muxaaraisiinta cusub waxay balan qaadeen inay mudnaan siiyaan ururinta dakhliga gudaha, oo ah qayb Soomaaliya taariikh ahaan uga dib maray deriskeeda gobolka, iyo sidoo kale xoojinta kormeerka iibsiga dadweynaha. Kooxaha ganacsiga ee Muqdisho ayaa si taxaddar leh u soo dhaweeyay isbeddelladan, in kastoo qaar ay ka digeen in isbeddel-badan oo ka dhaca wasaaradaha muhiimka ah uu carqaladayn karo qorshaynta muddada dheer.",
        "Shakhsiyaadka mucaaradku degdeg ayey ugu tilmaameen wax-ka-beddelka caddayn khilaaf gudaha ah oo ka dhex jira isbahaysiga xukunka halkii uu ka ahaan lahaa dadaal dib-u-habayn oo dhab ah, eedayn madaxtooyadu diiday. Falanqeeyayaasha siyaasaddu waxay sheegeen in isbeddellada golaha wasiirrada ee sidan oo kale ay inta badan la xidhiidhaan maareynta siyaasadda isbahaysiga sida ay ula xidhiidhaan nuxurka siyaasadda.",
      ],
    },
    ar: {
      title: "تعديل وزاري يركّز على الحقائب الاقتصادية مع تصاعد الضغط على الحكومة لتحقيق نتائج",
      excerpt:
        "أجرى الرئيس حسن شيخ محمود تعديلاً على عدة حقائب اقتصادية ومالية في خطوة وصفها مسؤولون بأنها محاولة لتعزيز الوفاء بالتزامات تخفيف الديون وإدارة المالية العامة.",
      body: [
        "أجرى الرئيس حسن شيخ محمود تعديلاً على عدة حقائب وزارية مرتبطة بالاقتصاد والمالية، وهي خطوة وصفها مكتبه بأنها محاولة لتعزيز أداء الحكومة في الوفاء بالتزامات تخفيف الديون وإصلاحات إدارة المالية العامة. وتمس التغييرات وزارات معنية بشكل مباشر بمشاركة الصومال المستمرة مع المؤسسات المالية الدولية.",
        "ويأتي التعديل فيما يواصل الصومال جهوده لإتمام عملية تخفيف ديون متعددة السنوات مع صندوق النقد الدولي والبنك الدولي، وهي عملية يقول مسؤولون إنها فتحت بالفعل حيزاً مالياً ملموساً لكنها تتطلب زخماً إصلاحياً مستداماً لتحقيقها بالكامل. ويشير محللون إلى أن ثقة المانحين تتوقف إلى حد كبير على استمرارية واضحة في إدارة الاقتصاد.",
        "وتعهد المعينون الجدد بإعطاء الأولوية لتعبئة الإيرادات المحلية، وهو مجال تخلّف فيه الصومال تاريخياً عن نظرائه الإقليميين، إلى جانب تعزيز الرقابة على المشتريات العامة. ورحّبت مجموعات تجارية في مقديشو بحذر بالتغييرات، رغم تحذير بعضها من أن التبديل المتكرر في الوزارات الرئيسية قد يعطّل التخطيط طويل الأمد.",
        "وسارعت شخصيات معارضة إلى وصف التعديل بأنه دليل على خلافات داخلية ضمن الائتلاف الحاكم أكثر منه دفعة إصلاح حقيقية، وهو اتهام رفضته الرئاسة. ويقول محللون سياسيون إن تغييرات وزارية من هذا النوع غالباً ما تتعلق بإدارة سياسة الائتلاف بقدر ما تتعلق بجوهر السياسات.",
      ],
    },
  },

  // ============ POLITICS 5 ============
  {
    categoryKey: "politics",
    en: {
      title: "Parliament Debates Media Regulation Bill Amid Press Freedom Concerns",
      excerpt:
        "Lawmakers are weighing a revised media law that supporters say modernises broadcast licensing, while journalist unions warn several provisions could be used to silence critical reporting.",
      body: [
        "Somalia's parliament has opened debate on a revised media regulation bill that supporters describe as a long-overdue modernisation of broadcast licensing and content standards, while journalist unions warn that several provisions risk being used to pressure critical outlets. The bill has been years in the making, cycling through multiple drafts amid disagreements between the information ministry and press advocacy groups.",
        "Backers of the legislation argue that Somalia's fragmented media landscape needs clearer rules on ownership transparency, broadcast standards during elections, and dispute resolution, pointing to chaotic licensing practices that have allowed politically-aligned outlets to operate with little oversight. A dedicated media commission would be empowered to issue and revoke licences under the proposed framework.",
        "Press freedom advocates counter that vague language around \"national security\" and \"public order\" in several clauses could be applied broadly to justify shutting down outlets critical of the government, echoing concerns raised about similar provisions in earlier drafts that were ultimately withdrawn after public pressure. Somalia continues to rank among the more dangerous environments for journalists in the region.",
        "Government representatives have pledged to incorporate feedback from a forthcoming round of consultations with media associations before a final vote, though no firm date has been set. Diplomats following the process say the bill's fate will be closely watched as a signal of the government's broader commitment to civic freedoms during the ongoing political transition.",
      ],
    },
    so: {
      title: "Baarlamaanku Ka Doodayaa Sharciga Nidaaminta Warbaahinta iyadoo Welwel ka Jiro Xorriyadda Saxaafadda",
      excerpt:
        "Sharci-dejiyayaashu waxay miisaamayaan sharci warbaahineed oo dib loo eegay oo taageerayaashu ay sheegayaan inuu casriyeeynayo shatiyaynta baahinta, halka ururrada saxaafadu ay ka digayaan qodobbo laga yaabo in lagu xakameeyo warbixinta naqdiyaha ah.",
      body: [
        "Baarlamaanka Soomaaliya ayaa furay doodda sharci nidaaminta warbaahinta oo dib loo eegay oo taageerayaashiisu ku tilmaamaan casriyeyn muddo dheer sugaysay oo ku saabsan shatiyaynta baahinta iyo heerarka waxa-soo-saarka, halka ururrada saxaafadu ay ka digayaan qodobbo dhowr ah oo halis ku ah in lagu isticmaalo cadaadis saxaafadaha naqdiyaha ah. Sharciga waxaa loo qorayay sanado, isagoo mari ku maray qabyo-qoraallo badan xilli khilaaf ka dhexeeya wasaaradda warfaafinta iyo kooxaha u doodda saxaafadda.",
        "Taageerayaasha sharciga ayaa ku dooda in muuqaalka warbaahinta ee kala jajaban ee Soomaaliya uu u baahan yahay sharciyo cad oo ku saabsan daahfurka lahaanshaha, heerarka baahinta xilliga doorashooyinka, iyo xallinta khilaafaadka, iyagoo tilmaamaya dhaqamada shatiyaynta oo qalalaase ah oo u ogolaaday saxaafadaha siyaasadeysan inay ka shaqeeyaan kormeer yar. Guddi warbaahineed oo gaar ah ayaa la siin doonaa awood ay ku bixin karto kuna baabi'in karto shatiyaynta qaab-dhismeedka la soo jeediyay.",
        "U-doodayaasha xorriyadda saxaafadda ayaa ka soo horjeeda in luuqad aan cad oo ku saabsan \"amniga qaranka\" iyo \"nidaamka dadweynaha\" ee ku jira dhowr qodob laga yaabo in si ballaadhan loo isticmaalo si loo caddeeyo xiritaanka saxaafadaha ka soo horjeeda dowladda, taasoo ka celcelinaysa welwel laga muujiyay qodobbo la mid ah oo qabyo-qoraallo hore ku jiray oo dib loo qaaday ka dib markii dadweynuhu cadaadiyeen. Soomaaliya waxay wali ka mid tahay deegaannada ugu khatarta badan gobolka ee saxaafadaha.",
        "Wakiilada dowladdu waxay balan qaadeen inay ku darsadaan jawaabaha wareeg soo socda oo la-tashi ah oo ay la yeelanayaan ururrada warbaahinta ka hor codbixinta ugu dambaysa, in kastoo taariikh go'an aan la go'aamin. Diblumaasiyiinta geeddi-socodka la socda ayaa sheegay in cidhiidhiga sharciga si dhow loo dabagali doono calaamad ahaan ballanqaadka ballaadhan ee dowladdu u hayso xorriyadaha madaniga ah xilliga kala-guurka siyaasadeed ee socda.",
      ],
    },
    ar: {
      title: "البرلمان يناقش مشروع قانون تنظيم الإعلام وسط مخاوف بشأن حرية الصحافة",
      excerpt:
        "يبحث المشرعون قانوناً إعلامياً منقّحاً يقول مؤيدوه إنه يحدّث ترخيص البث، بينما تحذّر نقابات الصحفيين من أن عدة بنود قد تُستخدم لإسكات التغطية النقدية.",
      body: [
        "افتتح برلمان الصومال نقاشاً حول مشروع قانون منقّح لتنظيم الإعلام يصفه مؤيدوه بأنه تحديث طال انتظاره لترخيص البث ومعايير المحتوى، بينما تحذّر نقابات الصحفيين من أن عدة بنود قد تُستخدم للضغط على وسائل الإعلام الناقدة. وقد استغرق إعداد مشروع القانون سنوات، مروراً بمسودات متعددة وسط خلافات بين وزارة الإعلام وجماعات الدفاع عن الصحافة.",
        "ويقول مؤيدو التشريع إن المشهد الإعلامي الصومالي المجزّأ يحتاج إلى قواعد أوضح بشأن شفافية الملكية ومعايير البث خلال الانتخابات وتسوية النزاعات، مشيرين إلى ممارسات ترخيص فوضوية سمحت لوسائل إعلام مرتبطة سياسياً بالعمل بإشراف ضئيل. وستُمنح لجنة إعلامية مخصصة صلاحية إصدار التراخيص وإلغائها بموجب الإطار المقترح.",
        "ويرد دعاة حرية الصحافة بأن اللغة الغامضة حول \"الأمن القومي\" و\"النظام العام\" في عدة بنود قد تُطبَّق على نطاق واسع لتبرير إغلاق وسائل إعلام ناقدة للحكومة، مكررين مخاوف أثيرت حول بنود مماثلة في مسودات سابقة سُحبت في النهاية بعد ضغط شعبي. ولا يزال الصومال من بين البيئات الأكثر خطورة على الصحفيين في المنطقة.",
        "وتعهد ممثلو الحكومة بدمج ملاحظات من جولة مقبلة من المشاورات مع الجمعيات الإعلامية قبل التصويت النهائي، رغم عدم تحديد موعد نهائي. ويقول دبلوماسيون يتابعون العملية إن مصير مشروع القانون سيُراقَب عن كثب كإشارة إلى التزام الحكومة الأوسع بالحريات المدنية خلال الانتقال السياسي الجاري.",
      ],
    },
  },

  // ============ POLITICS 6 ============
  {
    categoryKey: "politics",
    en: {
      title: "Foreign Minister's Gulf Tour Seeks to Deepen Investment Ties Amid Regional Rivalries",
      excerpt:
        "A week-long tour of Gulf capitals by Somalia's foreign minister aims to secure fresh investment pledges, as Mogadishu navigates competing regional interests along the Red Sea and Horn of Africa.",
      body: [
        "Somalia's foreign minister concluded a week-long tour of Gulf capitals aimed at deepening investment and security cooperation, as Mogadishu seeks to diversify its international partnerships while navigating an increasingly crowded field of regional interests along the Red Sea and Horn of Africa. The trip included stops focused on port development, agriculture, and reconstruction financing.",
        "Officials described the visits as productive, with several memoranda of understanding signed covering infrastructure feasibility studies and scholarship programmes for Somali students. Substantive new investment commitments, however, were framed as still under negotiation, reflecting the cautious pace at which Gulf capital has historically moved on Somali projects given persistent security concerns.",
        "The tour comes against a backdrop of intensifying competition for influence in the Horn of Africa, with multiple regional and international powers pursuing port access, fishing rights, and military basing arrangements along Somalia's long coastline. Analysts say Mogadishu's strategy has been to court multiple partners simultaneously rather than aligning exclusively with any single bloc.",
        "Domestic critics have questioned whether the government has adequately safeguarded national interests in prior port and resource agreements, and opposition lawmakers have called for greater parliamentary oversight of foreign investment deals. The foreign ministry has pledged to brief parliament on the outcomes of the tour in the coming weeks.",
      ],
    },
    so: {
      title: "Wareega Gacanka ee Wasiirka Arrimaha Dibadda oo Doonaya Sii Xoojinta Xiriirka Maalgashiga Xilli Tartan Gobol",
      excerpt:
        "Wareeg toddobaad ah oo ay wasiirka arrimaha dibadda Soomaaliya ku tagay caasimadaha Khaliijka ayaa lagu doonayaa inuu helo ballanqaad maalgashi oo cusub, iyadoo Muqdisho ay maareynayso danaha gobolka ee is-taraysa.",
      body: [
        "Wasiirka Arrimaha Dibadda ee Soomaaliya ayaa dhammeeyay wareeg toddobaad ah oo caasimadaha Khaliijka ah oo lagu doonayay in la sii xoojiyo maalgashiga iyo iskaashiga amniga, iyadoo Muqdisho ay doonayso inay kala duwanaysiiso saaxiibadeeda caalamiga ah iyadoo maareynaysa goob gobol oo si sii kordheysa u buuxsanaya oo ku saabsan Badda Cas iyo Geeska Afrika. Wareegga wuxuu ku jiray joogitaan diirad saaraya horumarinta deked, beeraha, iyo maalgelinta dib-u-dhiska.",
        "Saraakiishu waxay tilmaameen booqashooyinka kuwo faa'iido leh, iyadoo dhowr fahamka is-dhexgal ah la saxeexay oo daboolaya daraasado suurtogalnimo kaabayaal iyo barnaamijyo deeq-waxbarasho oo loogu talagalay ardayda Soomaaliyeed. Ballanqaadyada maalgashi ee cusub ee la taaban karo, si kastaba, waxaa lagu tilmaamay inay weli wadahadal ku jiraan, taasoo ka tarjumaysa xawaaraha taxaddarka leh ee ay maalku Khaliijku taariikh ahaan ugu socon jiray mashaariicda Soomaaliyeed maadaama uu jiro welwel amni oo joogto ah.",
        "Wareeggu wuxuu imanayaa iyadoo dhabarkiisu yahay tartan sii kordhaya oo ku saabsan saameynta Geeska Afrika, iyadoo awoodo badan oo gobol iyo caalami ah ay raadinayaan gelitaan dekedo, xuquuqda kalluumeysiga, iyo qorshayaal saldhig militari oo ku yaal xeebta dheer ee Soomaaliya. Falanqeeyayaashu waxay sheegeen in istaraatijiyadda Muqdisho ay ahayd inay wado shuraakada badan isku mar halkii ay isku xidhi lahayd hal isbahaysi oo keliya.",
        "Naqdiyayaasha gudaha ah ayaa su'aal ka keenay in dowladdu si ku filan u ilaalisay danaha qaranka heshiisyadii hore ee dekedaha iyo kheyraadka, sharci-dejiyayaasha mucaaradkuna waxay dalbadeen kormeer baarlamaani oo sii xoojiyeysan heshiisyada maalgashiga dibadda. Wasaaradda arrimaha dibaddu waxay ballan qaadeen inay baarlamaanka wax ka sheegaan natiijooyinka wareegga toddobaadyada soo socda.",
      ],
    },
    ar: {
      title: "جولة وزير الخارجية في الخليج تسعى لتعميق روابط الاستثمار وسط تنافس إقليمي",
      excerpt:
        "تهدف جولة استمرت أسبوعاً قام بها وزير خارجية الصومال في عواصم خليجية إلى تأمين تعهدات استثمارية جديدة، فيما تتنقل مقديشو بين مصالح إقليمية متنافسة على البحر الأحمر والقرن الأفريقي.",
      body: [
        "اختتم وزير خارجية الصومال جولة استمرت أسبوعاً في عواصم خليجية هدفت إلى تعميق الاستثمار والتعاون الأمني، فيما تسعى مقديشو إلى تنويع شراكاتها الدولية وهي تتنقل بين ساحة متزايدة الازدحام من المصالح الإقليمية على البحر الأحمر والقرن الأفريقي. وشملت الرحلة محطات ركّزت على تطوير الموانئ والزراعة وتمويل إعادة الإعمار.",
        "ووصف مسؤولون الزيارات بأنها مثمرة، مع توقيع عدة مذكرات تفاهم تغطي دراسات جدوى للبنية التحتية وبرامج منح دراسية لطلاب صوماليين. غير أن التزامات استثمارية جديدة وملموسة وُصفت بأنها لا تزال قيد التفاوض، ما يعكس الوتيرة الحذرة التي اعتادت بها رؤوس الأموال الخليجية التعامل مع المشاريع الصومالية نظراً لمخاوف أمنية مستمرة.",
        "وتأتي الجولة في ظل تنافس متصاعد على النفوذ في القرن الأفريقي، حيث تسعى قوى إقليمية ودولية متعددة للوصول إلى الموانئ وحقوق الصيد وترتيبات القواعد العسكرية على طول ساحل الصومال الطويل. ويقول محللون إن استراتيجية مقديشو كانت مغازلة شركاء متعددين في آن واحد بدلاً من الانحياز الحصري لأي كتلة بعينها.",
        "وتساءل منتقدون محليون عما إذا كانت الحكومة قد صانت المصالح الوطنية بشكل كافٍ في اتفاقيات سابقة للموانئ والموارد، ودعا مشرعون من المعارضة إلى رقابة برلمانية أكبر على صفقات الاستثمار الأجنبي. وتعهدت وزارة الخارجية بإحاطة البرلمان بنتائج الجولة في الأسابيع المقبلة.",
      ],
    },
  },

  // ============ POLITICS 7 ============
  {
    categoryKey: "politics",
    en: {
      title: "Opposition Coalition Calls for International Monitors Ahead of Disputed Election Timetable",
      excerpt:
        "The Future Council has demanded independent international observation of any upcoming electoral process, arguing that recent constitutional changes cannot be trusted to produce a credible vote without outside scrutiny.",
      body: [
        "The opposition Future Council held a press conference in Mogadishu calling for independent international monitors to oversee any electoral process conducted under the government's newly published timetable, arguing that recent constitutional changes were pushed through without sufficient consensus to be trusted domestically. The coalition stopped short of an outright boycott announcement but warned that participation would depend on guarantees around monitoring and dispute resolution.",
        "Coalition spokespeople argued that without credible, independent oversight, any vote held under the current framework risks being viewed as illegitimate by large segments of the population, potentially deepening rather than resolving the country's political divisions. They pointed to unresolved disputes over federal member state participation as a particular flashpoint.",
        "The federal government dismissed the call as unnecessary, noting that international partners already maintain observer missions in the country and arguing that the opposition's demands amount to a delay tactic. A government spokesperson said the electoral commission remains open to accrediting additional observers through the standard process.",
        "Diplomatic missions in Mogadishu have so far declined to take a public position on the dispute, though several have privately urged both sides to avoid actions that could further erode confidence in the process. With the political calendar tightening, analysts say the coming weeks will be decisive in determining whether the opposition ultimately engages or withdraws.",
      ],
    },
    so: {
      title: "Isbahaysiga Mucaaradka oo Dalbaday Kormeerayaal Caalami ah ka Hor Jadwalka Doorasho ee Muranka Leh",
      excerpt:
        "Golaha Mustaqbalka ayaa dalbaday kormeer madax-bannaan oo caalami ah oo la yeesho geeddi-socod doorasho oo kasta oo soo socda, iyagoo ku dooda in isbeddellada dastuuriga ah ee dhawaan aan lagu kalsoon karin inay soo saaraan cod-bixin la aamini karo kormeer dibadeed la'aantiis.",
      body: [
        "Isbahaysiga mucaaradka ee Golaha Mustaqbalka ayaa Muqdisho ku qabtay shir jaraa'id oo ay ku dalbadeen kormeerayaal madax-bannaan oo caalami ah oo dhawra geeddi-socod doorasho oo kasta oo lagu qabto jadwalka cusub ee dowladdu soo saartay, iyagoo ku dooday in isbeddellada dastuuriga ah ee dhawaan la ansixiyay aan si ku filan loo helin isku-raac dalku isugu kalsoon karo. Isbahaysigu ma dhicin baaqan qadar caadi ah oo qaadacaad ah, laakiin waxay ka digeen in ka-qaybgalku ku xiran yahay dammaanadaha ku saabsan kormeerka iyo xallinta khilaafaadka.",
        "Afhayeenada isbahaysigu waxay ku dooday in la'aanta kormeer madax-bannaan oo la aamini karo, doorasho kasta oo lagu qabto qaab-dhismeedka hadda ay khatar u tahay in loo arko mid aan sharci ahayn qaybo ballaadhan oo dadweynaha ah, taasoo laga yaabo inay sii qotondheereyso halkii ay xal u noqon lahayd kala-qaybsanaanta siyaasadeed ee dalka. Waxay tilmaameen khilaafyada aan xalin ee ku saabsan ka-qaybgalka dowlad-goboleedyada federaalka inay yihiin xasillooni-darro gaar ah.",
        "Dowladda federaalku waxay u tilmaamtay dalabkaas mid aan lagama maarmaan ahayn, iyagoo xusay in shurakada caalamigu ay hore u haystaan howlgallo kormeer oo dalka ku sugan, waxayna ku doodeen in dalabyada mucaaradku ay yihiin farsamo dib-u-dhigid. Afhayeen dowladeed ayaa sheegay in guddiga doorashadu ay wali diyaar u tahay inay ansixiso kormeerayaal dheeraad ah iyadoo la maro habka caadiga ah.",
        "Xafiisyada diblumaasiyadeed ee Muqdisho ilaa hadda waxay diideen inay qaataan mowqif dadweyne oo ku saabsan khilaafka, in kastoo qaarkood ay si gaar ah ugu dhiirrigeliyeen labada dhinac inay ka fogaadaan ficillo sii xoojiya kalsooni-darrada geeddi-socodka. Iyadoo jadwalka siyaasaddu uu sii cidhiidhiyayo, falanqeeyayaashu waxay sheegeen in toddobaadyada soo socda ay go'aan ka noqon doonaan in mucaaradku uu ugu dambeyntii ka qaybgalo ama uu ka baxo.",
      ],
    },
    ar: {
      title: "ائتلاف المعارضة يطالب بمراقبين دوليين قبل جدول انتخابي مثير للجدل",
      excerpt:
        "طالب مجلس المستقبل بمراقبة دولية مستقلة لأي عملية انتخابية مقبلة، مجادلاً بأن التعديلات الدستورية الأخيرة لا يمكن الوثوق بها لإنتاج اقتراع ذي مصداقية دون تدقيق خارجي.",
      body: [
        "عقد ائتلاف المعارضة، مجلس المستقبل، مؤتمراً صحفياً في مقديشو طالب فيه بمراقبين دوليين مستقلين للإشراف على أي عملية انتخابية تُجرى بموجب الجدول الزمني الذي نشرته الحكومة مؤخراً، مجادلاً بأن التعديلات الدستورية الأخيرة مُرّرت دون توافق كافٍ يجعلها موثوقة محلياً. ولم يعلن الائتلاف مقاطعة صريحة، لكنه حذّر من أن المشاركة ستعتمد على ضمانات بشأن المراقبة وتسوية النزاعات.",
        "وجادل متحدثون باسم الائتلاف بأنه دون رقابة مستقلة وذات مصداقية، فإن أي اقتراع يُجرى بموجب الإطار الحالي يخاطر بأن يُنظر إليه على أنه غير شرعي من قبل شرائح واسعة من السكان، ما قد يعمّق بدلاً من أن يحل الانقسامات السياسية في البلاد. وأشاروا إلى نزاعات لم تُحل حول مشاركة الولايات الأعضاء الاتحادية باعتبارها نقطة اشتعال خاصة.",
        "ورفضت الحكومة الاتحادية المطلب باعتباره غير ضروري، مشيرة إلى أن الشركاء الدوليين يحتفظون بالفعل ببعثات مراقبة في البلاد، وجادلت بأن مطالب المعارضة تمثّل تكتيكاً للتأخير. وقال متحدث باسم الحكومة إن اللجنة الانتخابية لا تزال منفتحة على اعتماد مراقبين إضافيين عبر العملية المعتادة.",
        "وامتنعت البعثات الدبلوماسية في مقديشو حتى الآن عن اتخاذ موقف علني من الخلاف، رغم أن عدداً منها حث الطرفين سراً على تجنب أي إجراءات قد تزيد تآكل الثقة في العملية. ومع تضييق الجدول الزمني السياسي، يقول محللون إن الأسابيع المقبلة ستكون حاسمة في تحديد ما إذا كانت المعارضة ستشارك في النهاية أو تنسحب.",
      ],
    },
  },

  // ============ POLITICS 8 ============
  {
    categoryKey: "politics",
    en: {
      title: "Somaliland and Somalia Hold Fresh Contacts as Regional Dynamics Shift",
      excerpt:
        "Officials from Hargeisa and Mogadishu have held informal contacts in recent weeks, reviving a long-dormant dialogue track even as both sides insist their fundamental positions remain unchanged.",
      body: [
        "Officials representing Hargeisa and Mogadishu have held a series of informal contacts in recent weeks, reviving a dialogue track that had been largely dormant for several years, according to people familiar with the discussions. Both sides have been careful to characterise the talks as exploratory and stressed that their fundamental positions on Somaliland's status remain unchanged.",
        "The renewed contact comes amid shifting regional dynamics, including intensified international interest in Red Sea security and competing outside offers of engagement with Hargeisa that have alarmed federal officials in Mogadishu. Analysts say the timing reflects as much external pressure as any genuine narrowing of the two sides' positions.",
        "Civil society groups on both sides have cautiously welcomed the renewed contact, arguing that even limited technical dialogue on issues such as air traffic coordination and trade can reduce friction regardless of the unresolved political status question. Previous rounds of talks, hosted by various international mediators, have repeatedly stalled over the same fundamental disagreement.",
        "Neither government has confirmed a timeline for a formal, higher-level resumption of talks. Regional diplomats say expectations should remain modest, given that similar openings in the past have not translated into durable progress on the core dispute.",
      ],
    },
    so: {
      title: "Somaliland iyo Soomaaliya oo Yeesheen Xiriir Cusub iyadoo Isbeddel ku Yimid Dhaqdhaqaaqa Gobolka",
      excerpt:
        "Saraakiisha Hargeysa iyo Muqdisho ayaa yeeshay xiriirro aan rasmi ahayn toddobaadyadii la soo dhaafay, iyagoo soo noolaynaya wadahadal muddo dheer hakad ku jiray, in kastoo labada dhinacba ay adkeeyeen in mowqifyadooda aasaasiga ah aysan isbeddelin.",
      body: [
        "Saraakiisha matalaya Hargeysa iyo Muqdisho ayaa yeeshay taxane xiriirro aan rasmi ahayn toddobaadyadii la soo dhaafay, iyagoo soo noolaynaya wadahadal inta badan hakad ku jiray dhowr sano, sida ay sheegeen dad la socda wadahadallada. Labada dhinacba waxay ka taxaddareen inay tilmaamaan wadahadallada mid baadhitaan ah, waxayna adkeeyeen in mowqifyadooda aasaasiga ah ee ku saabsan xaaladda Somaliland aysan isbeddelin.",
        "Xiriirka cusub ee la sameeyay wuxuu imanayaa iyadoo dhaqdhaqaaqa gobolku uu isbeddelayo, oo ay ku jiraan xiisaha caalamiga ah ee sii kordhaya ee amniga Badda Cas iyo shirqoolo dibadeed oo kala duwan oo la xiriiro Hargeysa oo argagax gelisay saraakiisha federaalka ee Muqdisho. Falanqeeyayaashu waxay sheegeen in waqtiga uu ka tarjumayo cadaadis dibadeed sida ay uga tarjumayso wax dhab ah oo ku saabsan cidhiidhinta mowqifyada labada dhinac.",
        "Kooxaha bulshada rayidka ah ee labada dhinac ayaa si taxaddar leh u soo dhaweeyay xiriirka cusub, iyagoo ku dooday in xitaa wadahadal farsamo oo xaddidan oo ku saabsan arrimo sida isku-duwidda dayuurad-socodka iyo ganacsiga ay yareyn karaan iskahorimaadka iyada oo aan loo eegin su'aasha xaaladda siyaasadeed ee aan xallin. Wareegyadii hore ee wadahadallada, oo ay martigelin jireen dhexdhexaadiyeyaal caalami ah oo kala duwan, ayaa marar badan ku wareegay khilaaf aasaasi ah oo isku mid ah.",
        "Labada dowladoodba weli ma xaqiijin jadwal ku saabsan dib-u-bilaabidda wadahadalka heer sare oo rasmi ah. Diblumaasiyiinta gobolku waxay sheegeen in filashadu ay ahaan tahay in ay yaraato, maadaama furimo la mid ah kuwan wixii hore aysan u beddelmin horumar waara oo ku saabsan khilaafka aasaasiga ah.",
      ],
    },
    ar: {
      title: "أرض الصومال والصومال يجريان اتصالات جديدة مع تحوّل ديناميكيات المنطقة",
      excerpt:
        "أجرى مسؤولون من هرجيسا ومقديشو اتصالات غير رسمية في الأسابيع الأخيرة، محيين مسار حوار كان راكداً لفترة طويلة رغم إصرار الطرفين على أن مواقفهما الأساسية لم تتغير.",
      body: [
        "أجرى مسؤولون يمثلون هرجيسا ومقديشو سلسلة من الاتصالات غير الرسمية في الأسابيع الأخيرة، محيين مسار حوار كان راكداً إلى حد كبير لعدة سنوات، بحسب أشخاص مطلعين على المناقشات. وحرص الطرفان على وصف المحادثات بأنها استكشافية، وشدّدا على أن مواقفهما الأساسية بشأن وضع أرض الصومال لم تتغير.",
        "ويأتي الاتصال المتجدد وسط تحوّل في ديناميكيات المنطقة، بما في ذلك اهتمام دولي متزايد بأمن البحر الأحمر وعروض خارجية متنافسة للتواصل مع هرجيسا أثارت قلق مسؤولين اتحاديين في مقديشو. ويقول محللون إن التوقيت يعكس ضغطاً خارجياً بقدر ما يعكس أي تقارب حقيقي في مواقف الطرفين.",
        "ورحّبت جماعات المجتمع المدني من الجانبين بحذر بالاتصال المتجدد، مجادلة بأن حتى الحوار التقني المحدود حول قضايا مثل تنسيق الحركة الجوية والتجارة يمكن أن يقلل الاحتكاك بصرف النظر عن مسألة الوضع السياسي غير المحلولة. وقد تعثرت جولات سابقة من المحادثات، استضافها وسطاء دوليون مختلفون، مراراً بسبب الخلاف الأساسي نفسه.",
        "ولم تؤكد أي من الحكومتين جدولاً زمنياً لاستئناف رسمي رفيع المستوى للمحادثات. ويقول دبلوماسيون إقليميون إن التوقعات ينبغي أن تبقى متواضعة، نظراً لأن انفتاحات مماثلة في الماضي لم تُترجم إلى تقدم دائم بشأن النزاع الجوهري.",
      ],
    },
  },

  // ============ POLITICS 9 ============
  {
    categoryKey: "politics",
    en: {
      title: "Constitutional Review Commission Submits Report Amid Calls for Broader Consultation",
      excerpt:
        "A federal commission tasked with reviewing disputed constitutional amendments has submitted its findings to parliament, recommending further consultation on the most contentious provisions.",
      body: [
        "The federal commission tasked with reviewing Somalia's most contested constitutional amendments has submitted its findings to parliament, recommending further consultation on provisions governing federal-state power sharing and the electoral system before final adoption. The report represents an attempt to bridge the gap between the federal government and states that have rejected earlier changes as insufficiently consultative.",
        "Commission members described their work as an effort to find technical common ground on questions that have become deeply politicised, focusing particularly on the division of authority between Mogadishu and federal member states over natural resource revenue and security force command structures. The report stops short of endorsing either side's preferred model outright.",
        "Reaction from federal member states has been mixed. Officials in some regions welcomed the recommendation for further consultation as validation of their concerns, while others dismissed the report as unlikely to change the government's underlying trajectory. Parliamentary leadership has not yet scheduled a debate on the findings.",
        "Civil society observers say the commission's work, whatever its ultimate influence, has at least generated a more detailed technical record of the disputes than existed previously — a resource that could prove useful whenever a genuine political settlement becomes possible.",
      ],
    },
    so: {
      title: "Guddiga Dib-u-eegista Dastuurka oo Gudbiyay Warbixin iyadoo Loo Baaqayo La-tashi Ballaadhan",
      excerpt:
        "Guddi federaal oo loo xilsaaray dib-u-eegista isbeddellada dastuuriga ah ee muran badan ayaa baarlamaanka u gudbiyay natiijooyinkeeda, iyadoo ku talinaysa la-tashi dheeraad ah oo ku saabsan qodobbada ugu muranka badan.",
      body: [
        "Guddiga federaalka ee loo xilsaaray dib-u-eegista isbeddellada ugu muranka badan ee dastuurka Soomaaliya ayaa baarlamaanka u gudbiyay natiijooyinkeeda, iyadoo ku talinaysa la-tashi dheeraad ah oo ku saabsan qodobbada xukuma qaybsiga awoodda ee federaalka-iyo-dowlad-goboleedyada iyo nidaamka doorashada ka hor ansixinta ugu dambaysa. Warbixintu waxay matashaa dadaal lagu doonayo in lagu xiro farqiga u dhexeeya dowladda federaalka iyo dowlad-goboleedyada diiday isbeddelladii hore iyagoo ku tilmaamay kuwo aan si ku filan loo wada tashan.",
        "Xubnaha guddiga ayaa u tilmaamay shaqadooda dadaal lagu doonayo in la helo aragti farsamo oo wada jira oo ku saabsan su'aalo si qoto dheer siyaasadeysan, iyagoo diirad gaar ah saaraya kala-qaybsanaanta awoodda ee u dhexeysa Muqdisho iyo dowlad-goboleedyada federaalka ee ku saabsan dakhliga kheyraadka dabiiciga ah iyo qaab-dhismeedka amarka ciidamada amniga. Warbixintu waxay ka gaabsatay inay si buuxda u taageerto qaabka ay dhinac kastaa doorbido.",
        "Falcelinta ka timid dowlad-goboleedyada federaalka waa mid isku dhafan. Saraakiisha qaar ka mid ah gobollada ayaa soo dhaweeyay talada la-tashiga dheeraadka ah oo ay u arkeen xaqiijinta welwelkooda, halka kuwo kale ay ku tilmaameen warbixinta mid aan u badnayn inay beddesho jihada aasaasiga ah ee dowladdu socoto. Hogaanka baarlamaanku ilaa hadda ma qorshaynin dood ku saabsan natiijooyinka.",
        "Kormeerayaasha bulshada rayidka ah ayaa sheegay in shaqada guddigu, si kastoo saameyntoodu ugu dambeyso, ay ugu yaraan soo saartay diiwaan farsamo oo faahfaahsan oo ku saabsan khilaafyada oo ka sii wanaagsan kii hore jiray — kheyraad laga yaabo inuu faa'iido u leeyahay marka la gaadho xal siyaasadeed oo dhab ah.",
      ],
    },
    ar: {
      title: "لجنة مراجعة الدستور تقدّم تقريرها وسط دعوات لتشاور أوسع",
      excerpt:
        "قدّمت لجنة اتحادية مكلفة بمراجعة التعديلات الدستورية المتنازع عليها نتائجها إلى البرلمان، موصية بمزيد من التشاور بشأن أكثر البنود إثارة للجدل.",
      body: [
        "قدّمت اللجنة الاتحادية المكلفة بمراجعة أكثر التعديلات الدستورية إثارة للجدل في الصومال نتائجها إلى البرلمان، موصية بمزيد من التشاور بشأن البنود التي تحكم تقاسم السلطة بين الحكومة الاتحادية والولايات والنظام الانتخابي قبل الاعتماد النهائي. ويمثل التقرير محاولة لسد الفجوة بين الحكومة الاتحادية والولايات التي رفضت تعديلات سابقة باعتبارها غير قائمة على تشاور كافٍ.",
        "ووصف أعضاء اللجنة عملهم بأنه محاولة لإيجاد أرضية تقنية مشتركة بشأن مسائل أصبحت مسيّسة بعمق، مع تركيز خاص على تقسيم السلطة بين مقديشو والولايات الأعضاء الاتحادية على إيرادات الموارد الطبيعية وهياكل قيادة قوات الأمن. ولم يؤيد التقرير بشكل قاطع النموذج المفضل لأي من الطرفين.",
        "وجاءت ردود الفعل من الولايات الأعضاء الاتحادية متباينة. فقد رحّب مسؤولون في بعض المناطق بتوصية التشاور الإضافي باعتبارها تأكيداً لمخاوفهم، بينما استبعد آخرون أن يغيّر التقرير المسار الأساسي للحكومة. ولم تحدد قيادة البرلمان بعد موعداً لمناقشة النتائج.",
        "ويقول مراقبون من المجتمع المدني إن عمل اللجنة، أياً كان تأثيره النهائي، أنتج على الأقل سجلاً تقنياً أكثر تفصيلاً للخلافات مما كان موجوداً سابقاً — وهو مورد قد يثبت فائدته متى أصبحت تسوية سياسية حقيقية ممكنة.",
      ],
    },
  },

  // ============ POLITICS 10 ============
  {
    categoryKey: "politics",
    en: {
      title: "Local Council Elections in Southwest State Test New Multiparty Rules",
      excerpt:
        "District council elections held across Southwest State are being closely watched as an early test of newly registered political parties competing outside the traditional clan-based selection process.",
      body: [
        "District council elections held across Southwest State this month are being closely watched by political observers as an early test of newly registered political parties competing outside Somalia's traditional clan-based selection process. The vote, covering several districts, is among the first to apply the multiparty framework that officials hope will eventually extend nationwide.",
        "Turnout figures released by regional officials showed participation exceeding expectations in urban districts, though rural turnout lagged, which local election monitors attributed to lingering distrust of the process and, in some areas, security concerns that limited voter mobility. Several smaller parties fielded candidates for the first time, testing their organisational reach beyond the capital.",
        "State officials described the elections as broadly credible, while noting isolated logistical delays and a handful of disputed results now before a local grievance committee. Party representatives across the political spectrum offered cautiously positive assessments, with several noting the process was calmer than many had anticipated.",
        "Analysts caution against reading too much into a single regional vote, but say the exercise offers a useful data point for federal officials designing the eventual nationwide electoral rollout, particularly on questions of voter registration logistics and security provisioning in areas with a continued Al-Shabaab presence nearby.",
      ],
    },
    so: {
      title: "Doorashooyinka Gollaha Maxalliga ah ee Koonfur-galbeed oo Tijaabinaya Xeerarka Xisbi-badan ee Cusub",
      excerpt:
        "Doorashooyinka gollaha degmooyinka ee ka dhacay Gobolka Koonfur-galbeed ayaa si dhow loo dabagalayaa iyagoo ah tijaabo hore oo xisbiyo siyaasadeed oo cusub oo diiwaan gashan ay ku tartamayaan meel ka baxsan habka doorashada qabaa'ilka ee dhaqameed.",
      body: [
        "Doorashooyinka gollaha degmooyinka ee ka dhacay Gobolka Koonfur-galbeed bishan ayaa si dhow ula socda kormeerayaasha siyaasadda iyagoo ah tijaabo hore oo xisbiyo siyaasadeed oo cusub oo diiwaan gashan ay ku tartamayaan meel ka baxsan habka doorashada qabaa'ilka ee dhaqameed ee Soomaaliya. Cod-bixinta, oo ka kooban dhowr degmo, waa mid ka mid ah kuwa ugu horreeya ee lagu dabaqo qaab-dhismeedka xisbi-badan ee saraakiishu rajaynayaan inuu ugu dambeyntii gaadho dalka oo dhan.",
        "Tirooyinka ka soo qaybgalka ee ay soo saareen saraakiisha gobolku waxay muujiyeen ka-qaybgal ka sarreeya filashada degmooyinka magaalada, in kastoo ka-qaybgalka miyiga uu ka dib maray, taasoo kormeerayaasha doorashada maxalliga ah ay ku eedeeyeen kalsooni-darro sii socota oo geeddi-socodka la haysto iyo, meelaha qaarkood, welwel amni oo xaddiday dhaqdhaqaaqa codbixiyeyaasha. Xisbiyo yaryar oo dhowr ah ayaa musharrixiin u saaray markii ugu horreysay, iyagoo tijaabinaya gaadhsiintooda hay'adeed ka baxsan caasimadda.",
        "Saraakiisha gobolku waxay doorashooyinka ku tilmaameen kuwo si guud loo aamini karo, iyagoo xusay dib-u-dhac farsamo oo la kala go'ay iyo dhawr natiijo oo la muransan oo hadda hor taagan guddi ashtakada maxalliga ah. Wakiillada xisbiyada oo dhan siyaasadda ayaa bixiyay qiimeyn taxaddar leh oo wanaagsan, iyadoo qaar ay xusuu in geeddi-socodku uu ka nabad badnaa sida ay badankoodu filayeen.",
        "Falanqeeyayaashu waxay ka digayaan in aan si xad-dhaaf ah looga akhriyin hal cod-bixin oo gobol ah, laakiin waxay sheegeen in tijaabadu ay bixiso xog faa'iido leh oo loogu talagalo saraakiisha federaalka ee naqshadeynaya baaxadda doorashada qaranka ee ugu dambeysa, gaar ahaan su'aalaha ku saabsan saadka diiwaangelinta codbixiyeyaasha iyo qabashada amniga meelaha ay Al-Shabaab ku sii jirto agagaarka.",
      ],
    },
    ar: {
      title: "انتخابات المجالس المحلية في ولاية جنوب غرب تختبر قواعد تعددية جديدة",
      excerpt:
        "تخضع انتخابات مجالس المقاطعات التي أُجريت في أنحاء ولاية جنوب غرب لمراقبة دقيقة باعتبارها اختباراً مبكراً لأحزاب سياسية مسجّلة حديثاً تتنافس خارج عملية الاختيار التقليدية القائمة على العشيرة.",
      body: [
        "تخضع انتخابات مجالس المقاطعات التي أُجريت في أنحاء ولاية جنوب غرب هذا الشهر لمراقبة دقيقة من المراقبين السياسيين باعتبارها اختباراً مبكراً لأحزاب سياسية مسجّلة حديثاً تتنافس خارج عملية الاختيار التقليدية القائمة على العشيرة في الصومال. ويُعد الاقتراع، الذي شمل عدة مقاطعات، من أوائل من طبّق الإطار التعددي الذي يأمل المسؤولون أن يمتد في النهاية إلى مستوى البلاد.",
        "وأظهرت أرقام الإقبال التي أصدرها مسؤولون إقليميون مشاركة تجاوزت التوقعات في المقاطعات الحضرية، رغم تراجع الإقبال في الريف، وهو ما عزاه مراقبون محليون للانتخابات إلى شكوك متبقية حيال العملية، وفي بعض المناطق، مخاوف أمنية حدّت من حركة الناخبين. وقدّمت عدة أحزاب صغيرة مرشحين للمرة الأولى، مختبرةً امتدادها التنظيمي خارج العاصمة.",
        "ووصف مسؤولو الولاية الانتخابات بأنها ذات مصداقية عموماً، مشيرين إلى تأخيرات لوجستية معزولة وعدد قليل من النتائج المتنازع عليها المعروضة الآن أمام لجنة تظلمات محلية. وقدّم ممثلو الأحزاب من مختلف الأطياف السياسية تقييمات إيجابية حذرة، مع إشارة عدد منهم إلى أن العملية كانت أكثر هدوءاً مما توقعه كثيرون.",
        "ويحذّر المحللون من المبالغة في تفسير اقتراع إقليمي واحد، لكنهم يقولون إن التجربة توفر نقطة بيانات مفيدة للمسؤولين الاتحاديين المصمّمين لعملية الطرح الانتخابي الوطنية النهائية، خصوصاً بشأن مسائل لوجستيات تسجيل الناخبين وتوفير الأمن في مناطق لا يزال لحركة الشباب وجود قريب منها.",
      ],
    },
  },

  // ============ POLITICS 11 ============
  {
    categoryKey: "politics",
    en: {
      title: "Parliament Approves Revised National Budget After Weeks of Debate Over Security Spending",
      excerpt:
        "Lawmakers passed a revised national budget after prolonged negotiations over the share allocated to security forces versus social services, with several MPs abstaining in protest.",
      body: [
        "Somalia's parliament approved a revised national budget after weeks of debate that centred largely on the proportion of spending allocated to security forces relative to health, education and social services. The final version passed with a comfortable majority, though a bloc of lawmakers abstained in protest, arguing the security allocation remained disproportionate given pressing civilian needs.",
        "Finance ministry officials defended the allocation, noting that security spending remains tied to the ongoing transition of responsibilities from international forces to Somali national forces, a process donors have made clear must be adequately resourced domestically as external funding recedes. Officials argued that under-resourcing security at this juncture would be a false economy.",
        "Opposition lawmakers countered that chronic underinvestment in basic services fuels the very instability the security budget is meant to address, pointing to persistently low enrollment figures in rural schools and underfunded regional hospitals as evidence of misplaced priorities. Several proposed amendments to shift additional funds toward health were narrowly defeated.",
        "The budget's passage clears the way for disbursement to begin in the new fiscal period, though implementation will be watched closely by international financial institutions monitoring Somalia's broader public financial management reforms as part of its ongoing debt relief programme.",
      ],
    },
    so: {
      title: "Baarlamaanku Wuxuu Ansixiyay Miisaaniyadda Qaranka ee Dib loo Eegay Ka Dib Toddobaadyo Doodo ah oo ku Saabsan Kharashka Amniga",
      excerpt:
        "Sharci-dejiyayaashu waxay ansixiyeen miisaaniyad qaran oo dib loo eegay ka dib wadahadalo dheeraaday oo ku saabsan qaybta loo qoondeeyay ciidamada amniga marka la barbar dhigo adeegyada bulshada, iyadoo dhowr xildhibaan ay ka gaabsadeen codbixinta.",
      body: [
        "Baarlamaanka Soomaaliya ayaa ansixiyay miisaaniyad qaran oo dib loo eegay ka dib toddobaadyo dood ah oo inta badan ku saabsanaa saamiga kharashka loo qoondeeyay ciidamada amniga marka la barbar dhigo caafimaadka, waxbarashada iyo adeegyada bulshada. Nooca ugu dambeeyay wuxuu ku ansixiyay aqlabiyad raaxo leh, in kastoo koox xildhibaanno ah ay ka gaabsadeen iyagoo mudaaharaadaya, iyagoo ku dooda in qoondaynta amniga ay wali tahay mid aan la simnayn baahiyaha degdegga ah ee dadweynaha.",
        "Saraakiisha wasaaradda maaliyadda ayaa u difaacay qoondaynta, iyagoo xusay in kharashka amniga uu wali xidhan yahay geeddi-socodka socda ee wareejinta mas'uuliyadaha ee ka socda ciidamada caalamiga ilaa ciidamada qaranka Soomaaliyeed, geeddi-socod deeq-bixiyeyaashu ay cad ka dhigeen inuu u baahan yahay in si ku filan loogu qoondeeyo kheyraad gudaha maadaama maalgelinta dibadda ay hoos u dhacayso. Saraakiishu waxay ku doodeen in maalgelin-yari amniga xilligan uu noqon lahaa dhaqaale khaldan.",
        "Xildhibaannada mucaaradku waxay ka celceliyeen in maalgelin-yari joogto ah oo ku dhacda adeegyada aasaasiga ah ay shido xasillooni-darrada ay miisaaniyadda amnigu ku talo galayso in la xalliyo, iyagoo tilmaamaya tirooyinka is-diiwaangelinta oo si joogto ah u hooseeya dugsiyada miyiga iyo isbitaalada gobolada oo maalgelin-yari haysta caddayn ah mudnaan qaldan. Dhowr wax-ka-beddel oo la soo jeediyay si loogu wareejiyo dheeraad caafimaadka ayaa si dhow loo jebiyay.",
        "Ansixinta miisaaniyaddu waxay furaysaa jidka bixinta inay bilaabato xilliga maaliyadeed ee cusub, in kastoo hirgelintu ay si dhow ula socon doonaan hay'adaha maaliyadeed ee caalamiga ah oo dabagalaya dib-u-habaynta maamulka maaliyadda dadweynaha ee Soomaaliya oo ballaadhan sida qayb ka mid ah barnaamijkeeda dejinta deynta ee socda.",
      ],
    },
    ar: {
      title: "البرلمان يقر الموازنة الوطنية المنقّحة بعد أسابيع من الجدل حول الإنفاق الأمني",
      excerpt:
        "أقر المشرعون موازنة وطنية منقّحة بعد مفاوضات مطوّلة حول حصة الإنفاق المخصصة لقوات الأمن مقابل الخدمات الاجتماعية، مع امتناع عدد من النواب عن التصويت احتجاجاً.",
      body: [
        "أقر برلمان الصومال موازنة وطنية منقّحة بعد أسابيع من الجدل تركّز إلى حد كبير على نسبة الإنفاق المخصصة لقوات الأمن مقارنة بالصحة والتعليم والخدمات الاجتماعية. ومرّت النسخة النهائية بأغلبية مريحة، رغم امتناع كتلة من النواب عن التصويت احتجاجاً، مجادلين بأن تخصيص الأمن لا يزال غير متناسب في ضوء الاحتياجات المدنية الملحّة.",
        "ودافع مسؤولون في وزارة المالية عن التخصيص، مشيرين إلى أن الإنفاق الأمني لا يزال مرتبطاً بالانتقال الجاري للمسؤوليات من القوات الدولية إلى القوات الوطنية الصومالية، وهي عملية أوضح المانحون أنها يجب أن تُموَّل محلياً بشكل كافٍ مع تراجع التمويل الخارجي. وجادل المسؤولون بأن نقص تمويل الأمن في هذه المرحلة سيكون اقتصاداً زائفاً.",
        "وردّ نواب المعارضة بأن نقص الاستثمار المزمن في الخدمات الأساسية يغذّي بالضبط عدم الاستقرار الذي يُفترض أن تعالجه ميزانية الأمن، مشيرين إلى أرقام تسجيل منخفضة باستمرار في المدارس الريفية ومستشفيات إقليمية ناقصة التمويل كدليل على أولويات في غير محلها. وهُزمت بفارق ضئيل عدة تعديلات مقترحة لتحويل تمويل إضافي نحو الصحة.",
        "ويفتح إقرار الموازنة الطريق أمام بدء الصرف في الفترة المالية الجديدة، رغم أن التنفيذ سيُراقَب عن كثب من قبل مؤسسات مالية دولية تتابع إصلاحات إدارة المالية العامة الأوسع في الصومال كجزء من برنامج تخفيف الديون الجاري.",
      ],
    },
  },

  // ============ POLITICS 12 ============
  {
    categoryKey: "politics",
    en: {
      title: "Traditional Elders Convene Nationwide Peace Conference to Ease Political Tensions",
      excerpt:
        "Clan elders from across Somalia's federal member states gathered in Mogadishu for a rare joint conference aimed at de-escalating tensions between the federal government and regional administrations.",
      body: [
        "Traditional clan elders from across Somalia's federal member states convened in Mogadishu this week for a rarely-held joint conference aimed at de-escalating rising tensions between the federal government and regional administrations. Organisers described the gathering, which drew delegations from every federal member state, as an effort to open a channel for dialogue outside the formal political process.",
        "Elders speaking at the conference called on both federal and state leaders to step back from confrontational rhetoric, warning that continued political brinkmanship risked reopening old wounds in a country where clan-based mediation has historically played a central role in resolving disputes that formal institutions could not.",
        "The conference produced a joint communique urging an immediate resumption of high-level political talks and calling for a moratorium on unilateral actions by either federal or state authorities while dialogue continues. It carries no binding authority, but organisers say its moral weight has historically proven significant in Somali politics.",
        "Reaction from political leaders was cautiously positive, with several officials on both sides of the federal-state divide releasing statements welcoming the elders' initiative, even as none committed to specific concessions. Observers say the gathering is unlikely on its own to resolve the underlying disputes but could help create space for the formal talks to resume.",
      ],
    },
    so: {
      title: "Odayaasha Dhaqanku waxay Qabteen Shir Nabadeed oo Qaran ah si loo Yareeyo Xiisadaha Siyaasadeed",
      excerpt:
        "Odayaasha qabaa'ilka ee ka socda dowlad-goboleedyada federaalka Soomaaliya oo dhan ayaa Muqdisho isugu yimid shir wadajir ah oo naadir ah oo lagu doonayo in la yareeyo xiisadaha u dhexeeya dowladda federaalka iyo maamulada gobolada.",
      body: [
        "Odayaasha qabaa'ilka dhaqanka ah ee ka socda dowlad-goboleedyada federaalka Soomaaliya oo dhan ayaa toddobaadkan Muqdisho isugu yimid shir wadajir ah oo naadir loo qabto oo lagu doonayo in la yareeyo xiisadaha sare u kacaya ee u dhexeeya dowladda federaalka iyo maamulada gobolada. Abaabulayaashu waxay tilmaameen kulanka, oo soo jiitay wafuud ka socda dowlad-goboleed federaal kasta, dadaal lagu doonayo in la furo qanaal wadahadal oo ka baxsan geeddi-socodka siyaasadeed ee rasmiga ah.",
        "Odayaasha ka hadlay shirku waxay ku baaqeen labada hoggaan ee federaalka iyo dowlad-goboleedyada inay ka noqdaan hadal iska-horimaad, iyagoo ka digay in xadgudubka siyaasadeed ee sii socda uu khatar u yahay furitaanka dhaawacyo hore dal ay dhexdhexaadinta qabaa'ilku taariikh ahaan door udub-dhexaad ah ka ciyaartay xallinta khilaafyada aysan hay'adaha rasmigu awoodin.",
        "Shirku wuxuu soo saaray war-saxaafadeed wadajir ah oo ku dhiirrigelinaya dib-u-bilaabidda degdeg ah ee wadahadalka siyaasadeed ee heerka sare iyo ku baaqaya joojinta ficillo hal-dhinac ah oo ay qaataan hay'adaha federaalka ama gobolada intii wadahadalku socon lahaa. Ma sidan awood xidhan, laakiin abaabulayaashu waxay sheegeen in miisaankeeda anshaxa taariikh ahaan uu muhiim u noqday siyaasadda Soomaaliyeed.",
        "Falcelinta hoggaamiyeyaasha siyaasadu waa mid taxaddar leh oo wanaagsan, iyadoo dhowr saraakiil ah oo labada dhinac ka socda kala-qaybsanaanta federaalka-iyo-gobolada ay soo saareen bayaanno ku soo dhaweynaya hindisaha odayaasha, xitaa in kastoo aan midkoodna ku ballanqaadin wax-ka-beddello gaar ah. Kormeerayaashu waxay sheegeen in kulanku uu keligiis aanu u badnayn inuu xalliyo khilaafyada aasaasiga ah laakiin uu ka caawin karo abuurista meel wadahadalka rasmigu ku dib-u-bilaabmo.",
      ],
    },
    ar: {
      title: "شيوخ العشائر يعقدون مؤتمر سلام وطنياً لتخفيف التوترات السياسية",
      excerpt:
        "اجتمع شيوخ عشائر من مختلف الولايات الأعضاء الاتحادية في الصومال في مقديشو لمؤتمر مشترك نادر يهدف إلى نزع فتيل التوتر بين الحكومة الاتحادية والإدارات الإقليمية.",
      body: [
        "اجتمع شيوخ عشائر تقليديون من مختلف الولايات الأعضاء الاتحادية في الصومال في مقديشو هذا الأسبوع في مؤتمر مشترك نادر الانعقاد يهدف إلى نزع فتيل التوترات المتصاعدة بين الحكومة الاتحادية والإدارات الإقليمية. ووصف المنظمون التجمع، الذي استقطب وفوداً من كل ولاية عضو اتحادية، بأنه محاولة لفتح قناة للحوار خارج العملية السياسية الرسمية.",
        "ودعا شيوخ تحدثوا في المؤتمر قادة الحكومة الاتحادية والولايات إلى التراجع عن الخطاب التصادمي، محذّرين من أن استمرار المواجهة السياسية يهدد بفتح جروح قديمة في بلد لعبت فيه الوساطة العشائرية تاريخياً دوراً محورياً في حل نزاعات عجزت المؤسسات الرسمية عن حلها.",
        "وأصدر المؤتمر بياناً مشتركاً يحث على استئناف فوري للمحادثات السياسية رفيعة المستوى ويدعو إلى وقف الإجراءات الأحادية من جانب السلطات الاتحادية أو سلطات الولايات ما دام الحوار مستمراً. ولا يحمل البيان سلطة ملزمة، لكن المنظمين يقولون إن وزنه الأخلاقي أثبت تاريخياً أهمية كبيرة في السياسة الصومالية.",
        "وكانت ردود فعل القادة السياسيين إيجابية بحذر، مع إصدار عدة مسؤولين من جانبي الانقسام بين الحكومة الاتحادية والولايات بيانات ترحّب بمبادرة الشيوخ، وإن لم يلتزم أي منهم بتنازلات محددة. ويقول مراقبون إن التجمع لن يحل على الأرجح بمفرده النزاعات الجوهرية لكنه قد يساعد في خلق مساحة لاستئناف المحادثات الرسمية.",
      ],
    },
  },

  // ============ TECHNOLOGY 1 ============
  {
    categoryKey: "technology",
    en: {
      title: "Starlink Goes Live Across Somalia, Promising to Narrow a Stubborn Digital Divide",
      excerpt:
        "SpaceX's satellite internet service is now operating nationwide in Somalia, offering high-speed connectivity to remote regions — though its cost puts it out of reach for many households.",
      body: [
        "Starlink, the satellite internet service operated by SpaceX, is now live across Somalia, marking one of the fastest regulatory-to-launch timelines the company has achieved on the African continent. The rollout followed the National Communications Authority's decision to grant Starlink a ten-year operating licence, a move officials framed as central to the country's digital-inclusion goals.",
        "The stakes are significant in a country where, by recent estimates, roughly 70 percent of the population lacks reliable broadband and internet access has been heavily concentrated in a handful of cities. Satellite coverage offers a way to reach rural clinics, schools and pastoralist communities that terrestrial infrastructure has bypassed after decades of conflict and underinvestment.",
        "Cost, however, remains a formidable barrier. Starlink's hardware kit and monthly subscription run well beyond the means of most Somali households, where average revenue per mobile user is only a few dollars a month. Analysts note that the service is likely, at least initially, to benefit institutions — aid organisations, businesses and public facilities — more than individual families.",
        "Even so, officials and industry observers see the launch as a structural shift. Somalia already relies on undersea cables such as EASSy and DARE1 for international bandwidth, and layering satellite coverage on top could improve resilience and extend reach. With further satellite upgrades promised, the government has cast the arrival of Starlink as a step toward its long-stated ambition of connecting all Somalis, wherever they live.",
        "Telecom operators have offered a mixed public response, with some framing satellite service as complementary to their own network expansion plans and others privately expressing concern about long-term competition for the lucrative urban data market once costs decline.",
      ],
    },
    so: {
      title: "Starlink oo Ka Bilaabmay Soomaaliya oo Dhan, Ballanqaadaya Yareynta Farqiga Dhijitaalka ee Adkaaday",
      excerpt:
        "Adeegga internetka dayax-gacmeedka ee SpaceX ayaa hadda ka shaqaynaya Soomaaliya oo dhan, isagoo siinaya xiriir xawaare sare leh gobollada fog — inkastoo qiimihiisu ka baxsan yahay awoodda qoysaska badan.",
      body: [
        "Starlink, oo ah adeegga internetka dayax-gacmeedka ee ay maamusho SpaceX, ayaa hadda ka shaqaynaya Soomaaliya oo dhan, taasoo calaamadaynaysa mid ka mid ah jadwalka ugu dhaqsaha badan ee sharci-ilaa-bilaw ee shirkaddu ku gaadhay qaaradda Afrika. Kicitaanku wuxuu raacay go'aankii Hay'adda Isgaarsiinta Qaranka ee ah in Starlink la siiyo shati shaqo oo toban sano ah, tallaabo ay saraakiishu ku tilmaameen udub-dhexaad u ah yoolalka ku-biirinta dhijitaalka ee dalka.",
        "Halistu waa mid weyn dal, sida qiyaasaha dhawaan, qiyaastii boqolkiiba 70 oo dadka ah ay ka maqan yihiin internet la isku halayn karo, marin-u-helka internetkuna uu si weyn ugu urursan yahay dhawr magaalo. Daboolka dayax-gacmeedku wuxuu bixinayaa hab lagu gaadho isbitaallada miyiga, dugsiyada iyo bulshooyinka reer-guuraaga ah ee kaabayaasha dhulku ay dhaafeen ka dib tobannaan sano oo colaad iyo maalgelin-yari ah.",
        "Qiimaha, si kastaba, wuxuu wali yahay caqabad weyn. Qalabka Starlink iyo lacagta bishii ee rukunka ah waxay aad uga sarreeyaan awoodda qoysaska Soomaaliyeed ee ugu badan, halkaas oo dakhliga celceliska ah ee isticmaale kasta oo mobayl uu yahay kaliya dhawr dollar bishii. Falanqeeyayaashu waxay xuseen in adeeggu uu u badan yahay, ugu yaraan bilowga, inuu faa'iido u yeesho hay'adaha — ururrada gargaarka, ganacsiyada iyo tas-hiilaadka dadweynaha — halkii ay ka ahaan lahaayeen qoysaska gaarka ah.",
        "Si kastaba ha ahaatee, saraakiisha iyo kuwa warshadaha dabagalaa waxay u arkaan bilaabistan isbeddel qaab-dhismeed. Soomaaliya waxay hore ugu tiirsanayd fiilooyinka hoosta badda sida EASSy iyo DARE1 xagga xawaaraha caalamiga ah, ku-darista daboolka dayax-gacmeedka korkaas waxay wanaajin kartaa adkaysiga oo ay balaadhin kartaa gaadhista. Iyadoo la ballanqaaday cusboonaysiin dheeraad ah oo dayax-gacmeed, dowladdu waxay imaanshaha Starlink ku tilmaantay tallaabo ku wajahan hammigeeda muddada dheer ee ah in la isku xiro dhammaan Soomaalida, meel kastoo ay joogaanba.",
        "Shirkadaha telefoonka ayaa bixiyay falcelin dadweyne oo isku dhafan, iyadoo qaar ay adeegga dayax-gacmeedka ku tilmaameen mid dhammaystirya qorshayaashooda balaadhinta shabakadooda, kuwo kalena ay si aan dadweyne ahayn uga muujiyeen welwel ku saabsan tartanka muddada dheer ee suuqa xogta magaalada ee faa'iidada leh marka qiimuhu hoos u dhaco.",
      ],
    },
    ar: {
      title: "ستارلينك تنطلق في جميع أنحاء الصومال واعدةً بتضييق فجوة رقمية عنيدة",
      excerpt:
        "تعمل خدمة الإنترنت الفضائي من سبيس إكس الآن على مستوى البلاد في الصومال، موفرةً اتصالاً عالي السرعة للمناطق النائية — رغم أن تكلفتها تظل بعيدة عن متناول كثير من الأسر.",
      body: [
        "أصبحت ستارلينك، خدمة الإنترنت الفضائي التي تشغّلها سبيس إكس، متاحة الآن في جميع أنحاء الصومال، مسجّلةً واحداً من أسرع جداول الانتقال من الترخيص إلى الإطلاق حققتها الشركة في القارة الأفريقية. وجاء الإطلاق عقب قرار الهيئة الوطنية للاتصالات منح ستارلينك رخصة تشغيل لمدة عشر سنوات، وهي خطوة وصفها المسؤولون بأنها محورية لأهداف البلاد في الشمول الرقمي.",
        "والمخاطر كبيرة في بلد يفتقر فيه، بحسب تقديرات حديثة، نحو 70 في المئة من السكان إلى نطاق عريض موثوق، وتركّز فيه الوصول إلى الإنترنت بشكل كبير في حفنة من المدن. وتوفّر التغطية عبر الأقمار الصناعية وسيلة للوصول إلى العيادات الريفية والمدارس ومجتمعات الرعاة التي تجاوزتها البنية التحتية الأرضية بعد عقود من الصراع وقلة الاستثمار.",
        "غير أن التكلفة تظل عائقاً هائلاً. فمعدّات ستارلينك والاشتراك الشهري يتجاوزان بكثير قدرة معظم الأسر الصومالية، حيث لا يتعدى متوسط الإيراد لكل مستخدم هاتف محمول بضعة دولارات شهرياً. ويشير المحللون إلى أن الخدمة يُرجّح، في البداية على الأقل، أن تفيد المؤسسات — منظمات الإغاثة والشركات والمرافق العامة — أكثر من الأسر الفردية.",
        "ومع ذلك، يرى المسؤولون ومراقبو القطاع في الإطلاق تحولاً بنيوياً. فالصومال يعتمد بالفعل على كابلات بحرية مثل إيسي ودار1 للنطاق الترددي الدولي، وإضافة التغطية الفضائية فوقها قد يحسّن المرونة ويوسّع نطاق الوصول. ومع الوعد بترقيات فضائية إضافية، صوّرت الحكومة وصول ستارلينك بأنه خطوة نحو طموحها المعلن منذ زمن بربط جميع الصوماليين، أينما كانوا.",
        "وقدّم مشغلو الاتصالات ردود فعل عامة متباينة، إذ صوّر بعضهم الخدمة الفضائية باعتبارها مكمّلة لخططهم الخاصة بتوسيع الشبكة، بينما أعرب آخرون بشكل غير علني عن قلقهم من منافسة طويلة الأمد على سوق بيانات المدن المربح متى تراجعت التكاليف.",
      ],
    },
  },

  // ============ TECHNOLOGY 2 ============
  {
    categoryKey: "technology",
    en: {
      title: "How Mobile Money Made Somalia a Fintech Pioneer Before It Rebuilt Its Banks",
      excerpt:
        "With mobile wallets now used by roughly three-quarters of adults, Somalia has built one of the world's most cash-light economies — and new reforms aim to make it lasting infrastructure.",
      body: [
        "Somalia's financial story runs in reverse of the conventional model. When the civil war dismantled the country's banking system in the 1990s, the institutions that survived were too damaged to rebuild quickly. Into that vacuum stepped mobile money: when Hormuud Telecom launched its EVC Plus platform, it was not disrupting banks so much as replacing them. Today mobile wallets function as de facto currency across much of the country.",
        "The scale is striking. Around three-quarters of Somalis aged sixteen and older now use mobile money, with usage even higher in cities. EVC Plus alone processes an enormous volume of transactions each month, and services such as Telesom's ZAAD and Dahabshiil's eDahab operate as everyday money in border regions where the shilling has lost ground.",
        "The challenge for the years ahead is to build durable institutions around that digital foundation. Hormuud has moved to integrate its wallet with commercial banks, allowing customers to shift funds between mobile balances and bank accounts, and Somalia has joined the Pan-African Payment and Settlement System to ease cross-border transactions. Reforms including a national payment switch and a payment-system law aim to knit these pieces into a fully interoperable network.",
        "Obstacles remain, from a shortage of qualified fintech talent to the broader task of extending trust and regulation across a fragmented market. But Somalia's trajectory has drawn international attention as a case study in how financial innovation can emerge from necessity — and how a system born of institutional collapse might mature into a foundation for broader economic development.",
      ],
    },
    so: {
      title: "Sida Lacagta Mobaylku uga Dhigtay Soomaaliya Hormuud Fintech ka hor Intaanay Dib u Dhisin Bangiyadeeda",
      excerpt:
        "Iyadoo jeebabka mobaylka ay hadda isticmaalaan qiyaastii saddex-meelood laba-meelood oo dadka waaweyn ah, Soomaaliya waxay dhistay mid ka mid ah dhaqaalayaasha ugu yar caddaanka — isbeddellada cusubna waxay doonayaan inay ka dhigaan kaab waarta.",
      body: [
        "Sheekada maaliyadeed ee Soomaaliya waxay ka socotaa dhinac ka soo horjeeda qaabka caadiga ah. Markii dagaalkii sokeeye uu burburiyay nidaamkii bangiyada dalka sannadihii 1990-meeyadii, hay'adihii badbaaday waxay ahaayeen kuwo aad u burburay oo aan si dhaqso ah dib loo dhisi karin. Meeshaas madhan waxaa soo galay lacagta mobaylka: markii Hormuud Telecom ay bilawday barnaamijkeeda EVC Plus, ma ahayn mid carqaladaynaya bangiyada intii ay ka beddelaysay. Maanta jeebabka mobaylku waxay u shaqeeyaan sidii lacag rasmi ah inta badan dalka.",
        "Baaxaddu waa mid cajiib ah. Qiyaastii saddex-meelood laba-meelood oo Soomaalida da'doodu tahay lix iyo toban jir iyo ka weyn ayaa hadda isticmaala lacagta mobaylka, isticmaalkuna aad buu uga sarreeyaa magaalooyinka. EVC Plus keligeed waxay bishii kaydisaa tiro aad u weyn oo macaamil ah, adeegyada sida ZAAD ee Telesom iyo eDahab ee Dahabshiil waxay u shaqeeyaan sidii lacag maalinle ah gobollada xuduudaha ah halkaas oo shilinku uu ka luntay.",
        "Caqabadda sannadaha soo socda waxay tahay in la dhiso hay'ado waara oo ku wareegsan aasaaskaas dhijitaalka ah. Hormuud waxay u dhaqaaqday inay jeebkeeda ku daabusho bangiyada ganacsiga, taasoo u ogolaanaysa macaamiisha inay lacag u wareejiyaan inta u dhaxaysa hadhaaga mobaylka iyo xisaabaadka bangiga, Soomaaliyana waxay ku biirtay Nidaamka Lacag-bixinta iyo Xisaabtanka Afrika oo dhan si loo fududeeyo macaamilada xuduudaha dhaafa. Isbeddellada oo ay ku jiraan beddelaad lacag-bixineed oo qaran iyo sharci nidaam-lacageed waxay doonayaan inay biraha isku xidhaan shabakad si buuxda u wada-shaqaysa.",
        "Caqabadyo ayaa weli jira, laga bilaabo yaraanta khibradda fintech ee u qalanta ilaa hawsha ballaadhan ee ah in la fidiyo kalsoonida iyo sharciyaynta suuq kala-jajaban. Laakiin socodka Soomaaliya wuxuu soo jiitay dareenka caalamiga ah isagoo ah tusaale muujinaya sida hal-abuurka maaliyadeed uga soo bixi karo baahi — iyo sida nidaam ka dhashay burburka hay'adeed uu u kori karo aasaas horumar dhaqaale oo ballaadhan.",
      ],
    },
    ar: {
      title: "كيف جعلت الأموال عبر الهاتف المحمول الصومال رائداً في التقنية المالية قبل أن يعيد بناء مصارفه",
      excerpt:
        "مع استخدام المحافظ الإلكترونية الآن من قبل نحو ثلاثة أرباع البالغين، بنى الصومال أحد أكثر الاقتصادات اعتماداً على المدفوعات الرقمية — وتهدف إصلاحات جديدة إلى جعله بنية دائمة.",
      body: [
        "تسير القصة المالية للصومال عكس النموذج التقليدي. فحين فكّكت الحرب الأهلية النظام المصرفي للبلاد في التسعينيات، كانت المؤسسات التي نجت أكثر تضرراً من أن يُعاد بناؤها بسرعة. وفي ذلك الفراغ دخلت الأموال عبر الهاتف المحمول: فحين أطلقت هرمود تيليكوم منصتها إي في سي بلس، لم تكن تعطّل المصارف بقدر ما كانت تحل محلها. واليوم تعمل المحافظ الإلكترونية كعملة فعلية في معظم أنحاء البلاد.",
        "والحجم لافت. فنحو ثلاثة أرباع الصوماليين ممن تبلغ أعمارهم ستة عشر عاماً فأكثر يستخدمون الآن الأموال عبر الهاتف المحمول، والاستخدام أعلى في المدن. وتعالج منصة إي في سي بلس وحدها حجماً هائلاً من المعاملات كل شهر، وتعمل خدمات مثل زاد من تيليسوم وإي دهب من دهب شيل كعملة يومية في المناطق الحدودية حيث تراجع الشلن.",
        "والتحدي في السنوات المقبلة هو بناء مؤسسات متينة حول ذلك الأساس الرقمي. فقد تحركت هرمود لدمج محفظتها مع المصارف التجارية، بما يتيح للعملاء نقل الأموال بين أرصدة الهاتف والحسابات المصرفية، وانضم الصومال إلى نظام المدفوعات والتسويات الأفريقي لتسهيل المعاملات العابرة للحدود. وتهدف إصلاحات تشمل محوّل مدفوعات وطنياً وقانوناً لنظام المدفوعات إلى نسج هذه القطع في شبكة قابلة للتشغيل البيني بالكامل.",
        "ولا تزال العقبات قائمة، من نقص الكفاءات المؤهلة في التقنية المالية إلى المهمة الأوسع المتمثلة في توسيع الثقة والتنظيم عبر سوق مجزّأة. لكن مسار الصومال جذب اهتماماً دولياً بوصفه دراسة حالة في كيفية نشوء الابتكار المالي من الضرورة — وكيف يمكن لنظام وُلد من انهيار مؤسسي أن ينضج ليصبح أساساً لتنمية اقتصادية أوسع.",
      ],
    },
  },

  // ============ TECHNOLOGY 3 ============
  {
    categoryKey: "technology",
    en: {
      title: "Somalia Bets on Digital Infrastructure to Leapfrog Decades of Lost Development",
      excerpt:
        "From satellite licences to a pan-African payments link, a cluster of recent decisions suggests a deliberate strategy: use digital infrastructure to jump past the development conflict long denied the country.",
      body: [
        "A series of recent moves points to a coherent wager by Somali policymakers: that the country can use digital infrastructure to leapfrog the physical development it never had the chance to build. Rather than waiting for roads, branch banks and fibre to reach every region, officials are prioritising technologies that can extend services quickly and cheaply across a vast, dispersed population.",
        "The evidence is accumulating. The nationwide licensing of satellite internet aims to bring connectivity to areas terrestrial networks have never served. On the financial side, Somalia's entry into the Pan-African Payment and Settlement System and a partnership between Hormuud and an international development agency to deepen cross-border payment infrastructure — including artificial-intelligence integration — signal an intent to plug the country's mobile-money ecosystem into regional and global rails.",
        "There are concrete social experiments too. Hormuud has begun financing low-cost smartphones for lower-income users, requiring only a small deposit and no formal credit history, with early pilot data showing low default rates. Programmes like these are designed to widen the on-ramp to the digital economy for households that formal finance has historically excluded.",
        "The strategy is not without risk. Affordability gaps, a shortage of skilled workers, and the fragility of state institutions all threaten to slow progress, and technology cannot substitute for political stability. But the direction of travel is clear, and Somalia's willingness to move faster than better-resourced neighbours has made it an unlikely example of how digital-first development can take shape in a fragile state.",
      ],
    },
    so: {
      title: "Soomaaliya oo Ku Kalsoonaneysa Kaabayaasha Dhijitaalka si ay uga Boodto Tobanaan Sano oo Horumar Lumay",
      excerpt:
        "Laga bilaabo shatiyada dayax-gacmeedka ilaa xiriirka lacag-bixinta Afrika oo dhan, go'aanno dhawaan la qaaday ayaa muujinaya istaraatijiyad ula kac ah: isticmaalka kaabayaasha dhijitaalka si looga booddo horumarkii colaaddu diiday.",
      body: [
        "Tallaabooyin dhawaan la qaaday oo isku xigxiga ayaa muujinaya sharad isku dhafan oo ay sameeyeen dejiyeyaasha siyaasadda Soomaaliyeed: in dalku isticmaali karo kaabayaasha dhijitaalka si uu uga booddo horumarka jireed ee uusan waligiis fursad u helin inuu dhiso. Halkii ay sugi lahaayeen in waddooyinka, laamaha bangiyada iyo fiibarku ay gaadhaan gobol kasta, saraakiishu waxay mudnaanta siinayaan teknoolajiyada balaadhin karta adeegyada si dhaqso iyo jaban dhammaan dadka ballaadhan ee kala firidhsan.",
        "Caddaymuhu way isa soo urursanayaan. Shatiyaynta dalka oo dhan ee internetka dayax-gacmeedka waxay ujeeddadeedu tahay inay xiriir keento meelaha aanay shabakadaha dhulku waligood u adeegin. Dhinaca maaliyadeed, ku-biiritaanka Soomaaliya ee Nidaamka Lacag-bixinta iyo Xisaabtanka Afrika oo dhan iyo iskaashi u dhexeeya Hormuud iyo hay'ad horumarineed caalami ah si loo qoto-dheereeyo kaabayaasha lacag-bixinta xuduudaha dhaafa — oo ay ku jirto isku-darka garaadka macmalka ah — waxay muujinayaan ujeeddo lagu xidhayo habraaca lacagta-mobaylka ee dalka biraha gobolka iyo caalamka.",
        "Waxaa jira tijaabooyin bulsho oo la taaban karo sidoo kale. Hormuud waxay bilawday inay maalgeliso taleefannada casriga ah ee qiimahoodu jaban yahay ee isticmaalayaasha dakhligoodu hooseeyo, iyadoo u baahan oo keliya deebaaji yar iyo taariikh amaah oo rasmi ah la'aan, iyadoo xogtii hore ee tijaabadu ay muujinayso heerar hoose oo dib-u-bixin la'aan ah. Barnaamijyada noocaan oo kale waxaa loogu talagalay inay ballaadhiyaan waddada u horseedaysa dhaqaalaha dhijitaalka ee qoysaska ay maaliyadda rasmigu taariikh ahaan ka saartay.",
        "Istaraatijiyaddu ma aha mid khatar la'aan ah. Farqiga awoodda-iibsiga, yaraanta shaqaalaha xirfadlayaasha ah, iyo jilicsanaanta hay'adaha dawladdu dhammaantood waxay khatar gelinayaan inay horumarka gaabiyaan, teknoolajiyaduna ma beddeli karto xasilloonida siyaasadeed. Laakiin jihada socodku waa cad, diyaarnimada Soomaaliya ee ah inay ka dhaqso badan tahay deriskeeda kheradka badan waxay ka dhigtay tusaale aan la filayn oo muujinaya sida horumarka dhijitaalka-hore uu qaab u yeelan karo dawlad jilicsan.",
      ],
    },
    ar: {
      title: "الصومال يراهن على البنية التحتية الرقمية لتخطي عقود من التنمية الضائعة",
      excerpt:
        "من تراخيص الأقمار الصناعية إلى رابط المدفوعات الأفريقي، تشير مجموعة من القرارات الأخيرة إلى استراتيجية متعمدة: استخدام البنية التحتية الرقمية لتجاوز التنمية التي حرم الصراع البلاد منها.",
      body: [
        "تشير سلسلة من التحركات الأخيرة إلى رهان متماسك من صانعي السياسات الصوماليين: أن البلاد تستطيع استخدام البنية التحتية الرقمية لتخطّي التنمية المادية التي لم تُتَح لها فرصة بنائها قط. فبدلاً من انتظار وصول الطرق والفروع المصرفية والألياف إلى كل إقليم، يعطي المسؤولون الأولوية للتقنيات القادرة على توسيع الخدمات بسرعة وبتكلفة زهيدة عبر سكان شاسعين ومتفرقين.",
        "والأدلة تتراكم. فالترخيص الوطني للإنترنت الفضائي يهدف إلى إيصال الاتصال إلى مناطق لم تخدمها الشبكات الأرضية قط. وعلى الصعيد المالي، يشير انضمام الصومال إلى نظام المدفوعات والتسويات الأفريقي، والشراكة بين هرمود ووكالة تنمية دولية لتعميق البنية التحتية للمدفوعات العابرة للحدود — بما في ذلك دمج الذكاء الاصطناعي — إلى نية لربط منظومة الأموال عبر الهاتف المحمول في البلاد بالسكك الإقليمية والعالمية.",
        "وهناك تجارب اجتماعية ملموسة أيضاً. فقد بدأت هرمود تمويل هواتف ذكية منخفضة التكلفة للمستخدمين ذوي الدخل المنخفض، لا تتطلب سوى وديعة صغيرة ودون تاريخ ائتماني رسمي، مع بيانات تجريبية مبكرة تُظهر معدلات تعثّر منخفضة. وصُمّمت برامج كهذه لتوسيع مدخل الاقتصاد الرقمي أمام الأسر التي استبعدها التمويل الرسمي تاريخياً.",
        "ولا تخلو الاستراتيجية من مخاطر. ففجوات القدرة على تحمل التكاليف، ونقص العمال المهرة، وهشاشة مؤسسات الدولة، كلها تهدد بإبطاء التقدم، ولا يمكن للتكنولوجيا أن تحل محل الاستقرار السياسي. لكن اتجاه المسار واضح، وقد جعل استعداد الصومال للتحرك أسرع من جيران أوفر موارد منه مثالاً غير متوقع على كيفية تشكّل التنمية الرقمية أولاً في دولة هشة.",
      ],
    },
  },

  // ============ TECHNOLOGY 4 ============
  {
    categoryKey: "technology",
    en: {
      title: "E-Commerce Slowly Takes Root in Somalia's Mobile-First Market",
      excerpt:
        "Online shopping is beginning to grow, built on mobile money and social media, even as logistics and trust remain significant hurdles.",
      body: [
        "Online commerce is slowly taking root in Somalia, growing on the foundation of the country's widespread mobile-money use and active social-media culture. Many transactions begin not on dedicated shopping platforms but through messaging apps and social networks, where sellers showcase goods and buyers arrange payment and delivery directly.",
        "This informal model suits local conditions. With mobile money already ubiquitous, paying for goods digitally is second nature, and social platforms provide reach without the cost of building a storefront. For small traders, selling online has become an accessible way to expand beyond a physical market stall.",
        "But scaling beyond informal sales runs into obstacles. Reliable delivery logistics are limited, formal addressing systems are patchy, and building trust between strangers transacting at a distance is difficult without established buyer protections. Disputes over undelivered or misrepresented goods can be hard to resolve.",
        "Entrepreneurs and observers see potential for more structured e-commerce to emerge, perhaps blending the trust of social selling with better logistics and payment guarantees. Whether that materialises depends on solving the practical problems of moving goods and building confidence — the unglamorous infrastructure on which any digital marketplace ultimately rests.",
      ],
    },
    so: {
      title: "Ganacsiga Elektaroonigga ah oo si Tartiib ah u Xididaysanaya Suuqa Mobayl-hore ee Soomaaliya",
      excerpt:
        "Iibka onlaynka ah ayaa bilaabaya inuu koro, isagoo ku dhisan lacagta mobaylka iyo warbaahinta bulshada, xitaa iyadoo saadka iyo kalsoonidu ay weli yihiin caqabado waaweyn.",
      body: [
        "Ganacsiga onlaynka ah ayaa si tartiib ah ugu xididaysanaya Soomaaliya, isagoo ku koraya aasaaska isticmaalka baahsan ee dalka ee lacagta mobaylka iyo dhaqanka warbaahinta bulshada ee firfircoon. Macaamil badan ma bilaabmaan platform-yo iibsi oo gaar ah laakiin waxay ku bilaabmaan ab-abyada fariinaha iyo shabakadaha bulshada, halkaas oo iibiyeyaashu ay soo bandhigaan alaab iibsadayaashuna ay si toos ah u habeeyaan lacag-bixinta iyo keenista.",
        "Moodalkan aan rasmiga ahayn wuxuu ku habboon yahay xaaladaha maxalliga ah. Iyadoo lacagta mobaylku ay mar hore meel walba joogto, bixinta alaabta si dijitaal ah waa dabeecad labaad, platform-yada bulshaduna waxay bixiyaan gaadhid iyada oo aan la bixin kharashka dhisidda dukaan. Ganacsatada yaryar, iibinta onlaynka ah waxay noqotay hab la heli karo oo lagu ballaadhiyo wax ka baxsan boos suuq oo jireed.",
        "Laakiin ballaadhinta wax ka baxsan iibka aan rasmiga ahayn waxay la kulantaa caqabado. Saadka keenista ee la isku halleyn karo waa xaddidan yahay, nidaamyada cinwaanka rasmiga ah waa dhuun-dhuun, dhisidda kalsoonida u dhexeysa dad aan is-aqoon oo masaafo ka macaamilaya waa adag tahay iyada oo aan jirin ilaalin iibsade oo la aasaasay. Muranada ku saabsan alaab aan la keenin ama si khaldan loo sharraxay waxay noqon karaan kuwo adag in la xalliyo.",
        "Ganacsato iyo goobjoogayaal waxay arkaan suurtogalnimada in ganacsi elektaroonig ah oo qaab-dhismeed leh uu soo baxo, laga yaabee inuu isku daro kalsoonida iibka bulshada iyo saad iyo dammaanad lacag-bixineed oo fiican. In taasi dhacdo iyo in kale waxay ku xiran tahay xallinta dhibaatooyinka wax-ku-ool ah ee guurinta alaabta iyo dhisidda kalsoonida — kaabayaasha aan quruxda badnayn ee ugu dambeyntii suuq kasta oo dijitaal ah uu ku tiirsan yahay.",
      ],
    },
    ar: {
      title: "التجارة الإلكترونية تترسّخ ببطء في سوق الصومال القائم على الهاتف أولاً",
      excerpt:
        "يبدأ التسوق عبر الإنترنت بالنمو، مبنياً على الأموال عبر الهاتف ووسائل التواصل الاجتماعي، حتى مع بقاء الخدمات اللوجستية والثقة عقبات كبيرة.",
      body: [
        "تترسّخ التجارة عبر الإنترنت ببطء في الصومال، نامية على أساس الاستخدام الواسع للأموال عبر الهاتف في البلاد وثقافة وسائل التواصل الاجتماعي النشطة. وتبدأ كثير من المعاملات لا على منصات تسوق مخصصة بل عبر تطبيقات المراسلة والشبكات الاجتماعية، حيث يعرض البائعون البضائع ويرتّب المشترون الدفع والتسليم مباشرةً.",
        "يناسب هذا النموذج غير الرسمي الظروف المحلية. فمع انتشار الأموال عبر الهاتف أصلاً، بات الدفع مقابل البضائع رقمياً أمراً بديهياً، وتوفّر المنصات الاجتماعية وصولاً من دون تكلفة بناء متجر. وبالنسبة لصغار التجار، أصبح البيع عبر الإنترنت طريقة متاحة للتوسع إلى ما بعد كشك السوق المادي.",
        "لكن التوسع إلى ما بعد المبيعات غير الرسمية يصطدم بعقبات. فالخدمات اللوجستية الموثوقة للتسليم محدودة، وأنظمة العنونة الرسمية متفرقة، وبناء الثقة بين غرباء يتعاملون عن بُعد صعب من دون حماية راسخة للمشتري. ويمكن أن يكون حل النزاعات حول بضائع لم تُسلَّم أو جرى تحريفها أمراً عسيراً.",
        "يرى رواد الأعمال والمراقبون إمكانية ظهور تجارة إلكترونية أكثر تنظيماً، ربما تمزج ثقة البيع الاجتماعي بخدمات لوجستية وضمانات دفع أفضل. وتحقّق ذلك يعتمد على حل المشكلات العملية لنقل البضائع وبناء الثقة — البنية التحتية غير البرّاقة التي يرتكز عليها في النهاية أي سوق رقمية.",
      ],
    },
  },

  // ============ TECHNOLOGY 5 ============
  {
    categoryKey: "technology",
    en: {
      title: "Data Centers and Cloud Services Eye Expansion Into East Africa",
      excerpt:
        "As internet use surges across the region, providers are weighing investment in local data infrastructure to bring cloud services closer to users.",
      body: [
        "As internet use surges across East Africa, technology providers are increasingly weighing investment in local data centres and cloud infrastructure. Bringing this capacity closer to users promises faster services, greater reliability, and reduced dependence on facilities located on other continents.",
        "For years, much of the data underpinning the region's digital services has been stored and processed far away, often in Europe. That distance introduces latency — a delay in how quickly services respond — and raises questions about resilience and data sovereignty. Local infrastructure could address all three.",
        "The economics are becoming more favourable. Rising demand, improving connectivity through submarine cables, and growing digital economies make the region more attractive for the kind of long-term investment that data centres represent. Reliable power, however, remains a critical prerequisite, and one that is uneven across the region.",
        "Analysts caution that infrastructure alone is not a strategy. Realising the benefits requires skilled workers to run these facilities, regulatory clarity around data, and demand from businesses and governments ready to move services into the cloud. If those pieces come together, local data infrastructure could become a quiet but important enabler of the region's digital growth.",
      ],
    },
    so: {
      title: "Xarumaha Xogta iyo Adeegyada Daruuraha oo Eegaya Balaadhin ku aaddan Bariga Afrika",
      excerpt:
        "Marka isticmaalka internetku uu kor u kacayo gobolka oo dhan, bixiyeyaashu waxay miisaamayaan maalgelin lagu sameeyo kaabayaasha xogta maxalliga ah si adeegyada daruuraha loogu soo dhoweeyo isticmaaleyaasha.",
      body: [
        "Marka isticmaalka internetku uu kor u kacayo Bariga Afrika, bixiyeyaasha teknoolajiyada ayaa si sii kordheysa u miisaamaya maalgelin lagu sameeyo xarumaha xogta maxalliga ah iyo kaabayaasha daruuraha. Soo-dhoweynta awooddan isticmaaleyaasha waxay ballanqaadaysaa adeegyo dhaqso badan, la-isku-halleyn wanaagsan, iyo hoos-u-dhac ku-tiirsanaanta xarumaha ku yaal qaaradaha kale.",
        "Muddo sannado ah, xogta badan ee taageerta adeegyada dijitaalka ah ee gobolka waxaa lagu kaydin jiray oo lagu farsameyn jiray meel fog, inta badan Yurub. Masaafadaas waxay soo gelisaa daahitaan — dib-udhac ku yimaadda sida ay adeegyadu si dhaqso ah uga jawaabaan — waxayna kicisaa su'aalo ku saabsan adkaysiga iyo madaxbannaanida xogta. Kaabayaasha maxalliga ah ayaa xallin kara saddexdaba.",
        "Dhaqaaluhu wuxuu noqonayaa mid ka roon. Baahida sii kordheysa, xiriirka sii hagaagaya ee fiilooyinka badda-hoosaadka ah, iyo dhaqaalayaasha dijitaalka ah ee sii kordhaya ayaa gobolka ka dhigaya mid soo jiidasho badan oo loogu talagalay nooca maalgelinta muddo-dheer ee xarumaha xogtu ay matalaan. Koronto la isku halleyn karo, si kastaba ha ahaatee, waxay weli tahay shuruud muhiim ah, mid aan siman gobolka oo dhan.",
        "Falanqeeyayaashu waxay ka digayaan in kaabayaashu keligood aysan ahayn istaraatijiyad. Xaqiijinta faa'iidooyinka waxay u baahan tahay shaqaale xirfad leh oo maamula xarumahan, cadayn sharci oo ku saabsan xogta, iyo baahi ka timaadda ganacsiyada iyo dowladaha diyaar u ah inay adeegyada u guuriyaan daruuraha. Haddii qaybahaas ay isku yimaadaan, kaabayaasha xogta maxalliga ah waxay noqon karaan wax aamusan laakiin muhiim ah oo fududeeya koritaanka dijitaalka ee gobolka.",
      ],
    },
    ar: {
      title: "مراكز البيانات والخدمات السحابية تتطلع للتوسع في شرق أفريقيا",
      excerpt:
        "مع تصاعد استخدام الإنترنت في أنحاء المنطقة، يدرس مزوّدو الخدمات الاستثمار في البنية التحتية المحلية للبيانات لتقريب الخدمات السحابية من المستخدمين.",
      body: [
        "مع تصاعد استخدام الإنترنت في أنحاء شرق أفريقيا، يدرس مزوّدو التكنولوجيا بشكل متزايد الاستثمار في مراكز البيانات المحلية والبنية التحتية السحابية. وتقريب هذه السعة من المستخدمين يَعِد بخدمات أسرع وموثوقية أكبر واعتماد أقل على مرافق تقع في قارات أخرى.",
        "لسنوات، جرى تخزين ومعالجة كثير من البيانات التي تقوم عليها الخدمات الرقمية في المنطقة في أماكن بعيدة، غالباً في أوروبا. وتُدخل تلك المسافة زمن استجابة — تأخيراً في سرعة استجابة الخدمات — وتثير أسئلة حول المرونة وسيادة البيانات. والبنية التحتية المحلية يمكن أن تعالج الثلاثة جميعاً.",
        "تتحسن الجدوى الاقتصادية. فالطلب المتزايد، وتحسّن الاتصال عبر الكابلات البحرية، والاقتصادات الرقمية النامية تجعل المنطقة أكثر جاذبية لنوع الاستثمار الطويل الأمد الذي تمثّله مراكز البيانات. غير أن الكهرباء الموثوقة تبقى شرطاً أساسياً حاسماً، وهو شرط متفاوت عبر المنطقة.",
        "يحذّر المحللون من أن البنية التحتية وحدها ليست استراتيجية. فتحقيق الفوائد يتطلب عمالاً مهرة لتشغيل هذه المرافق، ووضوحاً تنظيمياً حول البيانات، وطلباً من الشركات والحكومات المستعدة لنقل خدماتها إلى السحابة. وإذا اجتمعت تلك العناصر، فقد تصبح البنية التحتية المحلية للبيانات عاملاً هادئاً لكنه مهم في تمكين النمو الرقمي للمنطقة.",
      ],
    },
  },

  // ============ TECHNOLOGY 6 ============
  {
    categoryKey: "technology",
    en: {
      title: "Mogadishu Tech Hub Graduates First Cohort of Startup Founders",
      excerpt:
        "A Mogadishu-based innovation hub has graduated its first class of entrepreneurs from an accelerator programme, with founders building products ranging from agri-logistics apps to school-payment platforms.",
      body: [
        "A Mogadishu-based technology innovation hub has graduated its first cohort of entrepreneurs from a twelve-week accelerator programme, marking a small but symbolically significant milestone for Somalia's nascent startup ecosystem. The nine founding teams built products spanning agricultural logistics, school-fee payment platforms, and small-business inventory tools built around mobile money integration.",
        "Programme organisers said the accelerator deliberately focused on problems specific to the Somali market rather than importing models wholesale from more mature tech ecosystems elsewhere, pairing founders with local mentors from the telecom and banking sectors alongside a handful of diaspora advisers with international startup experience.",
        "Several graduating teams have already secured small seed investments from local angel investors, though founders and mentors alike acknowledge that Somalia's venture capital ecosystem remains in its infancy compared with more established East African hubs. Access to reliable payment rails and a shortage of specialised technical talent were cited as recurring early-stage obstacles.",
        "Organisers said a second cohort is being recruited for the coming term, with plans to expand mentorship partnerships with regional accelerators. Backers of the initiative describe it as a long-term bet: that nurturing homegrown technical talent, even in small numbers, is essential to building an economy less dependent on aid and remittances alone.",
      ],
    },
    so: {
      title: "Xarunta Teknoolajiyada ee Muqdisho oo Qalin-jabisay Kooxdeedii ugu Horreysay ee Aasaasayaasha Shirkadaha Bilowga ah",
      excerpt:
        "Xarun hal-abuur oo Muqdisho ku taal ayaa qalin-jabisay fasalkeedii ugu horreeyay ee ganacsatada ka soo baxay barnaamij dardar-galin ah, iyadoo aasaasayaashu ay dhiseen alaabooyin laga bilaabo abluujada beeraha ilaa madaxa lacag-bixinta dugsiyada.",
      body: [
        "Xarun hal-abuur teknoolajiyadeed oo Muqdisho ku taal ayaa qalin-jabisay kooxdeedii ugu horreysay ee ganacsatada ka soo baxay barnaamij dardar-galin laba iyo toban toddobaad ah, taasoo calaamadaynaysa mid yar laakiin astaan ahaan muhiim u ah nidaamka shirkadaha bilowga ah ee Soomaaliya oo aan weli dhalan. Sagaal kooxood oo aasaasayaal ah ayaa dhisay alaabooyin ay ka mid yihiin abluujada beeraha, madallada lacag-bixinta kharashka dugsiyada, iyo qalab kaydka ganacsiyada yaryar oo ku dhisan ku-darka lacagta mobaylka.",
        "Abaabulayaasha barnaamijku waxay sheegeen in dardar-galinta si ula kac ah diirad loogu saaray dhibaatooyinka gaarka u ah suuqa Soomaaliyeed halkii aan qaab-dhismeedyo dhammaystiran laga soo dejin lahayn nidaamyo teknoolaji oo meelo kale ka horumar badan, iyagoo aasaasayaasha la aayey mashruuciyaal maxalli ah oo ka socda qaybaha telefoonka iyo bangiyada oo ay weheliyaan dhowr la-taliye ah oo qurbaha ku nool oo leh khibrad shirkado bilow ah oo caalami ah.",
        "Dhowr koox oo qalin-jabisay ayaa mar hore helay maalgelin yar oo bilow ah oo ka yimid maalgeliyeyaal malaayiga ah oo maxalli ah, in kastoo aasaasayaasha iyo la-taliyeyaashuba ay aqoonsan yihiin in nidaamka raasumaalka khataraha leh ee Soomaaliya uu weli yaraado marka la barbar dhigo xarumaha Bariga Afrika ee horumarka badan. Gaadhista biraha lacag-bixinta la isku halayn karo iyo yaraanta khibradda farsamada gaarka ah ayaa lagu sheegay caqabado joogto ah oo marxaladda bilowga ah.",
        "Abaabulayaashu waxay sheegeen in koox labaad la doonayo semesterka soo socda, iyadoo qorshayaal la leeyahay in la ballaadhiyo iskaashiga la-taliyenimada ee dardar-galiyeyaasha gobolka. Taageerayaasha hindisaha ayaa ku tilmaamaya sharad muddo-dheer: in koritaanka khibrad farsamo oo dhalatay dalka, xitaa tiro yar, uu lagama maarmaan u yahay dhisidda dhaqaale ka yaraaday ku-tiirsanaanta gargaarka iyo lacagaha shisheeye ee keliya.",
      ],
    },
    ar: {
      title: "مركز تقني في مقديشو يخرّج أول دفعة من مؤسسي الشركات الناشئة",
      excerpt:
        "خرّج مركز ابتكار في مقديشو أول دفعة من رواد الأعمال من برنامج تسريع، ببناة منتجات تتراوح بين تطبيقات لوجستيات زراعية ومنصات دفع رسوم مدرسية.",
      body: [
        "خرّج مركز ابتكار تقني في مقديشو أول دفعة من رواد الأعمال من برنامج تسريع مدته اثنا عشر أسبوعاً، في محطة صغيرة لكنها رمزياً مهمة لمنظومة الشركات الناشئة الوليدة في الصومال. وبنت الفرق التسعة المؤسِّسة منتجات تشمل اللوجستيات الزراعية ومنصات دفع الرسوم المدرسية وأدوات جرد للمشاريع الصغيرة مبنية حول دمج الأموال عبر الهاتف المحمول.",
        "وقال منظمو البرنامج إن التسريع ركّز عمداً على مشكلات خاصة بالسوق الصومالي بدلاً من استيراد نماذج جاهزة من منظومات تقنية أكثر نضجاً في أماكن أخرى، مع إقران المؤسسين بموجّهين محليين من قطاعي الاتصالات والمصارف إلى جانب عدد قليل من مستشارين من الشتات ذوي خبرة دولية في الشركات الناشئة.",
        "وحصلت عدة فرق خرّيجة بالفعل على استثمارات بذرة صغيرة من مستثمرين ملائكيين محليين، رغم إقرار المؤسسين والموجّهين على حد سواء بأن منظومة رأس المال الجريء في الصومال لا تزال في مهدها مقارنة بمراكز أكثر رسوخاً في شرق أفريقيا. وأُشير إلى محدودية الوصول إلى قنوات دفع موثوقة ونقص الكفاءات التقنية المتخصصة باعتبارها عقبات متكررة في المرحلة المبكرة.",
        "وقال المنظمون إنه يجري تجنيد دفعة ثانية للفصل الدراسي المقبل، مع خطط لتوسيع شراكات التوجيه مع مسرّعات إقليمية. ويصف داعمو المبادرة الأمر بأنه رهان طويل الأمد: أن رعاية المواهب التقنية المحلية، حتى بأعداد صغيرة، ضرورية لبناء اقتصاد أقل اعتماداً على المعونات والتحويلات المالية وحدها.",
      ],
    },
  },

  // ============ TECHNOLOGY 7 ============
  {
    categoryKey: "technology",
    en: {
      title: "Banks and Telecoms Step Up Cybersecurity Spending After String of Fraud Attempts",
      excerpt:
        "Financial institutions are investing more heavily in fraud detection and network security following a rise in phishing schemes and SIM-swap attempts targeting mobile money customers.",
      body: [
        "Somali banks and telecom operators are increasing investment in cybersecurity infrastructure following a rise in phishing schemes and SIM-swap fraud attempts targeting mobile money customers, according to industry officials briefed on recent incident data. While the overall volume of successful fraud remains a small fraction of total transactions, the growth rate has prompted concern among regulators.",
        "Fraud typically follows familiar patterns: attackers impersonate telecom customer service agents to trick victims into revealing PINs, or exploit weak identity-verification processes to hijack a victim's phone number and, with it, access to their mobile wallet. Officials say the schemes have grown more sophisticated as awareness campaigns have made the crudest versions less effective.",
        "In response, operators have rolled out additional authentication layers, expanded customer education campaigns delivered via SMS and radio, and strengthened coordination with the central bank's financial intelligence unit to flag suspicious transaction patterns more quickly. Several institutions have also hired dedicated fraud-analytics staff for the first time.",
        "Analysts note that Somalia's heavy reliance on mobile money — with wallets functioning as the primary financial instrument for most households — raises the stakes of getting cybersecurity right, since a major breach of public confidence could ripple through an economy that depends on digital payments functioning reliably every day.",
      ],
    },
    so: {
      title: "Bangiyada iyo Shirkadaha Telefoonka oo Kordhiyay Kharashka Amniga Internetka Ka Dib Taxane Isku-dayo Khiyaano ah",
      excerpt:
        "Hay'adaha maaliyadeed ayaa si aad ah ugu maalgelinaya ogaanshaha khiyaanada iyo amniga shabakadda ka dib kororka khiyaano-jiil iyo isku-dayo SIM-badbaadin ah oo bartilmaameedsan macaamiisha lacagta mobaylka.",
      body: [
        "Bangiyada Soomaaliyeed iyo shirkadaha telefoonku waxay kordhinayaan maalgelinta kaabayaasha amniga internetka ka dib kororka khiyaano-jiil iyo isku-dayo khiyaano SIM-badbaadin ah oo bartilmaameedsan macaamiisha lacagta mobaylka, sida ay sheegeen saraakiil warshadeed oo la wargeliyay xogta dhacdooyinka dhawaan. In kastoo baaxadda guud ee khiyaanada guuleysta ay tahay qayb yar oo macaamil dhammaystiran ah, heerka koritaanku wuxuu ka dhaliyay welwel xayndaabinta.",
        "Khiyaanadu inta badan waxay raacdaa qaabab la aqoon: weerarayaashu waxay ka dhig-dhigaan wakiillo adeeg macaamil oo telefoon si ay ugu khiyaaneeyaan dhibbanayaasha inay ka shaacbaxaan lambarrada PIN-ka, ama waxay ka faa'iidaystaan geeddi-socodyo caddaynta aqoonsiga oo daciif ah si ay u afduubaan lambarka telefoonka dhibbanaha iyo, sidaas awgeed, gelitaanka jeebkiisa mobaylka. Saraakiishu waxay sheegeen in hindisayaashu ay noqdeen kuwo aad u dhalanteed badan iyadoo ololayaasha wacyi-gelinta ay ka dhigeen nooca ugu qallalan mid aan wax ku ool ahayn.",
        "Jawaab ahaan, shirkaduhu waxay soo saareen lakabyo dheeraad ah oo xaqiijin ah, waxay ballaadhiyeen ololayaasha waxbarashada macaamiisha ee lagu geeyo fariimaha gaagaaban iyo raadiyaha, waxayna xoojiyeen isku-duwidda unugga sirdoonka maaliyadeed ee bangiga dhexe si loo calaamadeeyo si dhaqso badan qaababka macaamilada shaki galinaya. Dhowr hay'adood ayaa sidoo kale la shaqaaleysiiyay shaqaale gaar ah oo falanqaynaya khiyaanooyinka markii ugu horreysay.",
        "Falanqeeyayaashu waxay xusuu in ku-tiirsanaanta weyn ee Soomaaliya ee lacagta mobaylka — iyadoo jeebabku u shaqeeyaan sida qalabka maaliyadeed ee ugu waaweyn qoysaska badankood — ay kordhinayso halista in amniga internetka si sax ah loo helo, maadaama burin weyn oo ku dhaca kalsoonida dadweynaha ay saameyn karto dhaqaale ku tiirsan in lacag-bixinta dijitaalka ah ay maalin walba si la isku halayn karo u shaqayso.",
      ],
    },
    ar: {
      title: "المصارف وشركات الاتصالات تزيد الإنفاق على الأمن السيبراني بعد سلسلة محاولات احتيال",
      excerpt:
        "تستثمر المؤسسات المالية بشكل أكبر في كشف الاحتيال وأمن الشبكات بعد ارتفاع مخططات التصيّد ومحاولات استبدال شرائح الهاتف التي تستهدف عملاء الأموال عبر الهاتف المحمول.",
      body: [
        "تزيد المصارف الصومالية وشركات الاتصالات استثماراتها في البنية التحتية للأمن السيبراني بعد ارتفاع مخططات التصيّد ومحاولات احتيال استبدال شرائح الهاتف التي تستهدف عملاء الأموال عبر الهاتف المحمول، بحسب مسؤولين في القطاع اطّلعوا على بيانات حوادث حديثة. ورغم أن الحجم الإجمالي للاحتيال الناجح لا يزال جزءاً صغيراً من إجمالي المعاملات، فإن معدل النمو أثار قلق الجهات التنظيمية.",
        "وعادة ما يتبع الاحتيال أنماطاً مألوفة: يتظاهر المهاجمون بأنهم موظفو خدمة عملاء في شركات الاتصالات لخداع الضحايا للكشف عن أرقامهم السرية، أو يستغلون عمليات تحقق ضعيفة من الهوية للاستيلاء على رقم هاتف الضحية، وبالتالي الوصول إلى محفظته الإلكترونية. ويقول مسؤولون إن المخططات أصبحت أكثر تطوراً مع جعل حملات التوعية أبسط الأشكال أقل فعالية.",
        "وردّاً على ذلك، طرح المشغّلون طبقات تحقق إضافية، ووسّعوا حملات توعية العملاء عبر الرسائل النصية والإذاعة، وعزّزوا التنسيق مع وحدة الاستخبارات المالية التابعة للبنك المركزي لرصد أنماط المعاملات المشبوهة بسرعة أكبر. كما استعانت عدة مؤسسات لأول مرة بموظفين متخصصين في تحليل الاحتيال.",
        "ويشير محللون إلى أن اعتماد الصومال الكبير على الأموال عبر الهاتف المحمول — إذ تعمل المحافظ كالأداة المالية الأساسية لمعظم الأسر — يرفع مخاطر الفشل في ضبط الأمن السيبراني، إذ إن خرقاً كبيراً للثقة العامة يمكن أن يمتد أثره عبر اقتصاد يعتمد على عمل المدفوعات الرقمية بشكل موثوق كل يوم.",
      ],
    },
  },

  // ============ TECHNOLOGY 8 ============
  {
    categoryKey: "technology",
    en: {
      title: "Solar Microgrids Extend Power to Off-Grid Towns, Enabling New Connectivity Gains",
      excerpt:
        "Small-scale solar power projects are bringing reliable electricity to towns long dependent on costly diesel generators, in turn making local internet and mobile services more viable.",
      body: [
        "Small-scale solar microgrid projects are bringing more reliable electricity to Somali towns that have long depended on costly, intermittent diesel generation, with developers and local officials saying the shift is also making local internet and mobile services more commercially viable to operate. Several projects completed this year serve towns that previously had power for only a few hours a day.",
        "Diesel has historically dominated Somalia's off-grid power supply, but volatile fuel prices and supply disruptions have made costs unpredictable for both households and businesses. Solar developers say falling panel and battery costs have made microgrids increasingly competitive, particularly for towns too small or remote to justify extending a national grid that, in truth, barely exists outside major cities.",
        "The power gains carry knock-on benefits for connectivity. Telecom towers that once relied on expensive diesel-fed backup power can now draw on more stable local generation, improving network uptime, while small businesses report longer operating hours and reduced spoilage for refrigerated goods.",
        "Financing remains the central constraint on scaling the model further. Developers say most projects to date have relied on a mix of donor grants and diaspora investment rather than commercial lending, and argue that a clearer regulatory framework for independent power producers would help attract the private capital needed to expand solar access nationwide.",
      ],
    },
    so: {
      title: "Shabakadaha Yaryar ee Qorraxda oo Koronto Gaadhsiinaya Magaalooyin ka Baxsan Shabakadda, Taasoo Suurtogal ka dhigaysa Faa'iido Xiriir oo Cusub",
      excerpt:
        "Mashaariic yaryar oo tamarta qorraxda ah ayaa koronto la isku halayn karo u keenaya magaalooyin muddo dheer ku tiirsanaa jeneraytarada naaftada oo qaali ah, taasoo isla markaana suurtogal ka dhigaysa adeegyada internetka iyo mobaylka maxalliga ah.",
      body: [
        "Mashaariic yaryar oo shabakado qorraxeed ah ayaa koronto la isku halayn karo u keenaya magaalooyin Soomaaliyeed oo muddo dheer ku tiirsanaa koronto naaftada ah oo qaali ah oo si joogto ah u go'gooshan, iyadoo horumariyeyaal iyo saraakiil maxalli ah ay sheegeen in isbeddelku uu sidoo kale ka dhigayo adeegyada internetka iyo mobaylka maxalliga ah kuwo ganacsi ahaan suurtogal u ah in la maamulo. Dhowr mashruuc oo dhammaaday sanadkan ayaa u adeega magaalooyin hore koronto u lahaa oo keliya dhawr saacadood maalintii.",
        "Naaftadu taariikh ahaan waxay xukumi jirtay bixinta korontada ee ka baxsan shabakadda Soomaaliya, laakiin qiimayaasha shidaalka ee isbeddela iyo carqaladaha bixinta ayaa ka dhigay kharashyada kuwo aan la saadaalin karin qoysaska iyo ganacsiyadaba. Horumariyeyaasha qorraxdu waxay sheegeen in qiimaha hoos u dhacaya ee taabalada iyo battarrada ay ka dhigeen shabakadaha yaryar kuwo si sii kordheysa tartan ugu jira, gaar ahaan magaalooyinka aad u yar ama fog ee aan sabab u ahayn in la balaadhiyo shabakad qaran oo, run ahaantii, aan si dhab ah u jirin meel ka baxsan magaalooyinka waaweyn.",
        "Faa'iidooyinka korontada waxay wataan faa'iidooyin kale oo la xidhiidha xiriirka. Taabaha telefoonka ee mar hore ku tiirsanaa koronto kaydeed oo naaftadu quudiso oo qaali ah ayaa hadda ka faa'iidaysan kara wax-soo-saar maxalli ah oo ka xasilloon, taasoo hagaajinaysa waqtiga shabakaddu socoto, halka ganacsiyada yaryaru ay soo sheegeen saacadaho hawleed oo dheeraysan iyo dhimista alaabta qabow-qaadka ah ee kharribma.",
        "Maalgelintu waxay weli tahay xaddidaadda udub-dhexaadka ah ee balaadhinta moodalkan sii wadata. Horumariyeyaashu waxay sheegeen in inta badan mashaariicda ilaa hadda ay ku tiirsanaayeen isku-dhafka deeqaha deeq-bixiyeyaasha iyo maalgelinta qurbaha halkii ay ka ahaan lahayd amaah ganacsi, waxayna ku doodaan in qaab-dhismeed xayndaabineed oo caddaan ah oo loogu talagalo soo-saareyaasha korontada madax-bannaan ay caawin lahaayeen soo jiidashada raasumaalka gaarka ah ee loo baahan yahay si loo balaadhiyo gelitaanka qorraxda dalka oo dhan.",
      ],
    },
    ar: {
      title: "الشبكات الشمسية الصغيرة توصل الكهرباء لبلدات خارج الشبكة وتتيح مكاسب اتصال جديدة",
      excerpt:
        "تجلب مشاريع طاقة شمسية صغيرة الحجم كهرباء موثوقة لبلدات اعتمدت طويلاً على مولدات ديزل باهظة التكلفة، ما يجعل بدوره خدمات الإنترنت والهاتف المحلية أكثر جدوى تجارياً.",
      body: [
        "تجلب مشاريع شبكات شمسية صغيرة الحجم كهرباء أكثر موثوقية لبلدات صومالية اعتمدت طويلاً على توليد ديزل باهظ التكلفة ومتقطع، ويقول مطورون ومسؤولون محليون إن هذا التحول يجعل أيضاً خدمات الإنترنت والهاتف المحلية أكثر جدوى تجارية للتشغيل. وتخدم عدة مشاريع اكتملت هذا العام بلدات كانت الكهرباء فيها متاحة سابقاً لبضع ساعات فقط يومياً.",
        "وهيمن الديزل تاريخياً على إمداد الكهرباء خارج الشبكة في الصومال، لكن تقلب أسعار الوقود واضطرابات الإمداد جعلا التكاليف غير قابلة للتنبؤ للأسر والشركات على حد سواء. ويقول مطورو الطاقة الشمسية إن انخفاض تكاليف الألواح والبطاريات جعل الشبكات الصغيرة أكثر تنافسية تدريجياً، خصوصاً للبلدات الصغيرة جداً أو النائية التي لا تبرر مد شبكة وطنية بالكاد توجد أصلاً خارج المدن الكبرى.",
        "وتحمل مكاسب الكهرباء فوائد مصاحبة للاتصال. فأبراج الاتصالات التي كانت تعتمد على طاقة احتياطية مكلفة تعمل بالديزل يمكنها الآن الاعتماد على توليد محلي أكثر استقراراً، ما يحسّن زمن تشغيل الشبكة، بينما تفيد شركات صغيرة بساعات تشغيل أطول وتلف أقل للبضائع المبردة.",
        "ويبقى التمويل القيد المركزي أمام توسيع النموذج أكثر. ويقول مطورون إن معظم المشاريع حتى الآن اعتمدت على مزيج من منح المانحين واستثمارات الشتات بدلاً من الإقراض التجاري، ويجادلون بأن إطاراً تنظيمياً أوضح لمنتجي الطاقة المستقلين من شأنه أن يساعد في جذب رأس المال الخاص اللازم لتوسيع الوصول إلى الطاقة الشمسية على مستوى البلاد.",
      ],
    },
  },

  // ============ TECHNOLOGY 9 ============
  {
    categoryKey: "technology",
    en: {
      title: "Universities Launch New Computer Science Tracks to Meet Employer Demand",
      excerpt:
        "Somali universities are expanding computer science and software engineering programmes as local employers report a persistent shortage of qualified technical graduates.",
      body: [
        "Several Somali universities have launched or expanded computer science and software engineering tracks this academic year, responding to employer surveys that consistently cite a shortage of qualified technical graduates as a constraint on growth for local technology and telecom firms. The new tracks emphasise practical, project-based coursework alongside traditional theory.",
        "Faculty involved in the redesign say the curriculum was built in consultation with telecom operators and fintech companies, aiming to close the gap between what graduates learn and what employers actually need — a mismatch that has long pushed the most qualified students toward emigration or remote work for foreign firms rather than local employment.",
        "Enrolment in the new tracks has exceeded initial projections, according to university administrators, though they caution that laboratory equipment, reliable internet access on campus, and a shortage of instructors with industry experience remain persistent constraints on quality. Several institutions have begun partnering with regional universities to share specialised faculty remotely.",
        "Graduates from pilot cohorts have already been absorbed into local telecom and banking IT departments, according to programme coordinators, who describe early placement rates as an encouraging, if still small-scale, signal that locally trained technical talent can find a path into the domestic economy rather than leaving it.",
      ],
    },
    so: {
      title: "Jaamacadaha oo Bilaabay Waddooyin Cusub oo Sayniska Kombiyuutarka ah si ay ula Kulmaan Baahida Shaqo-bixiyeyaasha",
      excerpt:
        "Jaamacadaha Soomaaliyeed ayaa balaadhinaya barnaamijyada sayniska kombiyuutarka iyo injineernimada software-ka iyadoo shaqo-bixiyeyaasha maxalliga ah ay ka warramayaan yaraan joogto ah oo qalin-jabiyeyaal farsamo oo qalan ah.",
      body: [
        "Dhowr jaamacadood oo Soomaaliyeed ayaa bilaabay ama balaadhiyay waddooyin sayniska kombiyuutarka iyo injineernimada software-ka sannad-dugsiyeedkan, iyagoo ka jawaabaya sahamin shaqo-bixiye oo si joogto ah u xusaa yaraanta qalin-jabiyeyaal farsamo oo qalan ah oo caqabad u ah koritaanka shirkadaha teknoolajiyada iyo telefoonka ee maxalliga ah. Waddooyinka cusub waxay xoojiyaan casharro wax-ku-ool ah oo ku salaysan mashruuc oo ay weheliyaan aragti dhaqameed.",
        "Kulliyaddaha ku lug leh naqshadaynta cusub waxay sheegeen in manhajka lagu dhisay la-tashi la yeeshay shirkadaha telefoonka iyo shirkadaha fintech-ka, iyadoo lagu doonayo in la xiro farqiga u dhexeeya waxa qalin-jabiyeyaashu bartaan iyo waxa shaqo-bixiyeyaashu runtii u baahan yihiin — farqi taariikh ahaan riixay ardayda ugu qalanta ay u guuraan dibadda ama u shaqeeyaan shirkado shisheeye oo fog halkii ay shaqo maxalli ah ka heli lahaayeen.",
        "Is-diiwaangelinta waddooyinka cusub ayaa dhaafay filashadii hore, sida ay sheegeen maamulayaasha jaamacadaha, in kastoo ay ka digeen in qalabka shaybaarka, gelitaanka internetka ee la isku halayn karo ee jaamacadda dhexdeeda, iyo yaraanta macallimiinta khibradda warshadaha leh ay weli yihiin xaddidaadyo joogto ah oo saameeya tayada. Dhowr hay'adood ayaa bilaabay inay la iskaashadaan jaamacadaha gobolka si ay si fog ula wadaagaan macallimiin takhasus leh.",
        "Qalin-jabiyeyaasha kooxaha tijaabada ahi ayaa hore loogu qaatay qaybaha IT-ga ee bangiyada iyo telefoonka maxalliga ah, sida ay sheegeen isku-duwayaasha barnaamijka, kuwaas oo heerarka shaqo-helidda hore ku tilmaamay calaamado dhiirrigelin leh, in kastoo ay weli yihiin kuwo baaxad yar, oo muujinaya in khibrad farsamo oo dhalatay dalka ay heli karto jid ku gudbaya dhaqaalaha guriga halkii ay ka baxi lahayd.",
      ],
    },
    ar: {
      title: "الجامعات تطلق مسارات جديدة لعلوم الحاسوب لتلبية طلب أصحاب العمل",
      excerpt:
        "توسّع الجامعات الصومالية برامج علوم الحاسوب وهندسة البرمجيات مع تقارير أصحاب عمل محليين عن نقص مستمر في الخريجين التقنيين المؤهلين.",
      body: [
        "أطلقت عدة جامعات صومالية أو وسّعت هذا العام الدراسي مسارات في علوم الحاسوب وهندسة البرمجيات، استجابة لاستطلاعات أصحاب العمل التي تشير باستمرار إلى نقص الخريجين التقنيين المؤهلين كقيد على نمو شركات التكنولوجيا والاتصالات المحلية. وتشدد المسارات الجديدة على مقررات عملية قائمة على المشاريع إلى جانب النظرية التقليدية.",
        "ويقول أعضاء هيئة التدريس المشاركون في إعادة التصميم إن المنهج بُني بالتشاور مع مشغّلي الاتصالات وشركات التقنية المالية، بهدف سد الفجوة بين ما يتعلمه الخريجون وما يحتاجه أصحاب العمل فعلياً — وهو عدم تطابق دفع طويلاً أكثر الطلاب تأهيلاً نحو الهجرة أو العمل عن بُعد لشركات أجنبية بدلاً من التوظيف المحلي.",
        "وتجاوز الالتحاق بالمسارات الجديدة التوقعات الأولية، بحسب إداريي الجامعات، رغم تحذيرهم من أن معدات المختبرات والوصول الموثوق للإنترنت داخل الحرم الجامعي ونقص المدرّسين ذوي الخبرة الصناعية لا تزال قيوداً مستمرة على الجودة. وبدأت عدة مؤسسات الشراكة مع جامعات إقليمية لتبادل أعضاء هيئة تدريس متخصصين عن بُعد.",
        "وقد جرى استيعاب خريجي الدفعات التجريبية بالفعل في أقسام تقنية المعلومات بشركات الاتصالات والمصارف المحلية، بحسب منسقي البرنامج، الذين وصفوا معدلات التوظيف المبكرة بأنها إشارة مشجّعة، وإن كانت لا تزال صغيرة الحجم، على أن المواهب التقنية المدرَّبة محلياً يمكن أن تجد طريقاً إلى الاقتصاد المحلي بدلاً من مغادرته.",
      ],
    },
  },

  // ============ TECHNOLOGY 10 ============
  {
    categoryKey: "technology",
    en: {
      title: "Farmers in Lower Shabelle Turn to SMS Weather Alerts to Manage Erratic Rains",
      excerpt:
        "A pilot programme delivering localised weather forecasts via text message is helping smallholder farmers time planting decisions in a region where rainfall has grown increasingly unpredictable.",
      body: [
        "A pilot programme delivering localised weather forecasts by text message is helping smallholder farmers in Lower Shabelle time planting and irrigation decisions in a region where rainfall patterns have grown increasingly erratic. The service, developed with a regional meteorological agency and a local telecom partner, sends short forecasts in Somali to farmers who register their district by SMS.",
        "Organisers say the low-tech delivery format was a deliberate choice: smartphone penetration and reliable data access remain limited in rural farming districts, while basic SMS works on virtually any handset and does not require an active data plan. Farmers pay only standard messaging rates, with the forecast content itself provided free during the pilot phase.",
        "Early participants describe modest but meaningful benefits — delaying planting by a few days ahead of a forecast dry spell, for instance, or timing fertiliser application around expected rain. Agricultural extension workers involved in the programme say the real value lies less in forecast precision than in giving farmers any structured information at all in a data environment that has historically offered almost none.",
        "Programme organisers hope to expand coverage to additional riverine districts next season, pending additional funding, and say they are exploring partnerships to layer in market price information alongside weather alerts — giving farmers a fuller picture of both when to plant and where to sell.",
      ],
    },
    so: {
      title: "Beeraleyda Shabeelaha Hoose oo u Jeestay Digniinaha Cimilada ee SMS-ka si ay u Maareeyaan Roobabka Isbeddela",
      excerpt:
        "Barnaamij tijaabo ah oo saadaasha cimilada ee maxalliga ah lagu geeyo fariin gaaban ayaa u kaalmeynaya beeraleyda dhulka yar-yar inay wakhtiyeeyaan go'aannada beerashada gobol ay roobabku ku sii kordheen sida aan la saadaalin karin.",
      body: [
        "Barnaamij tijaabo ah oo saadaasha cimilada ee maxalliga ah lagu geeyo fariimo gaagaaban ayaa u kaalmeynaya beeraleyda dhulka yar-yar ee Shabeelaha Hoose inay wakhtiyeeyaan go'aannada beerashada iyo waraabinta gobol ay qaababka roobabku ku sii kordheen sida aan la saadaalin karin. Adeegga, oo lala samaystay hay'ad cimileed oo gobol ah iyo shirkad telefoon oo maxalli ah, wuxuu u diraa saadaal gaagaaban oo Af-soomaali ah beeraleyda diiwaan gelisay degmadooda iyada oo SMS ah.",
        "Abaabulayaashu waxay sheegeen in qaabka geynta teknoolajiyada hooseysa uu ahaa doorasho ula kac ah: gelitaanka moobiillada casriga ah iyo helitaanka xogta la isku halayn karo ayaa weli xaddidan degmooyinka beeraha ee miyiga, halka SMS-ka aasaasiga ahi uu ku shaqeeyo ku dhawaad taleefan kasta oo aan u baahnayn qorshe xog oo firfircoon. Beeraleydu waxay bixiyaan kaliya qiimaha fariinta caadiga ah, iyadoo nuxurka saadaasha lafteeda lagu bixiyay bilaash inta lagu jiro marxaladda tijaabada.",
        "Ka-qaybgalayaasha hore waxay sheegayaan faa'iidooyin yar laakiin macno leh — sida dib u dhigidda beerashada dhowr maalmood ka hor xilli abaareed la saadaaliyay, tusaale ahaan, ama wakhtiyeynta marinta bacriminta agagaarka roob la filayo. Shaqaalaha waxbarashada beeraha ee ka qaybqaata barnaamijku waxay sheegeen in qiimaha runta ahi uu ka yar yahay sax-nimada saadaasha waxaa ka badan siinta beeraleyda macluumaad qaab-dhismeed leh oo kasta oo ay ku jiraan deegaan xog ah oo taariikh ahaan aan waxba bixin.",
        "Abaabulayaasha barnaamijku waxay rajaynayaan inay ku balaadhiyaan daboolka degmooyinka webiga ku yaal ee kale xilliga soo socda, iyadoo ku xiran maalgelin dheeraad ah, waxayna sheegeen inay baadhayaan iskaashiyo lagu darsan karo macluumaadka qiimaha suuqa oo la socda digniinaha cimilada — taasoo beeraleyda siinaysa sawir buuxa oo ku saabsan goorta la beero iyo halka la iibiyo labadaba.",
      ],
    },
    ar: {
      title: "مزارعون في شبيلي السفلى يلجؤون إلى تنبيهات الطقس عبر الرسائل النصية لإدارة الأمطار غير المنتظمة",
      excerpt:
        "يساعد برنامج تجريبي يقدّم توقعات طقس محلية عبر الرسائل النصية صغار المزارعين على توقيت قرارات الزراعة في منطقة أصبحت فيها الأمطار غير قابلة للتنبؤ بشكل متزايد.",
      body: [
        "يساعد برنامج تجريبي يقدّم توقعات طقس محلية عبر الرسائل النصية صغار المزارعين في شبيلي السفلى على توقيت قرارات الزراعة والري في منطقة أصبحت أنماط الأمطار فيها غير منتظمة بشكل متزايد. وترسل الخدمة، التي طُوّرت بالتعاون مع هيئة أرصاد جوية إقليمية وشريك اتصالات محلي، توقعات قصيرة باللغة الصومالية للمزارعين الذين يسجلون مقاطعتهم عبر رسالة نصية.",
        "ويقول المنظمون إن صيغة التوصيل بتقنية بسيطة كانت خياراً متعمداً: فانتشار الهواتف الذكية والوصول الموثوق للبيانات لا يزالان محدودين في مقاطعات الزراعة الريفية، بينما تعمل الرسائل النصية الأساسية على أي هاتف تقريباً ولا تتطلب باقة بيانات فعّالة. ويدفع المزارعون فقط رسوم الرسائل القياسية، مع تقديم محتوى التوقعات نفسه مجاناً خلال المرحلة التجريبية.",
        "ويصف المشاركون الأوائل فوائد متواضعة لكنها ذات معنى — مثل تأجيل الزراعة بضعة أيام قبل موجة جفاف متوقعة، أو توقيت استخدام الأسمدة حول أمطار متوقعة. ويقول عاملو الإرشاد الزراعي المشاركون في البرنامج إن القيمة الحقيقية تكمن أقل في دقة التوقعات وأكثر في منح المزارعين أي معلومات منظمة على الإطلاق في بيئة بيانات لم تقدّم تاريخياً شيئاً يُذكر.",
        "ويأمل منظمو البرنامج في توسيع التغطية لمقاطعات نهرية إضافية الموسم المقبل، رهناً بتمويل إضافي، ويقولون إنهم يستكشفون شراكات لإضافة معلومات أسعار السوق إلى جانب تنبيهات الطقس — لمنح المزارعين صورة أكمل عن متى يزرعون وأين يبيعون.",
      ],
    },
  },

  // ============ TECHNOLOGY 11 ============
  {
    categoryKey: "technology",
    en: {
      title: "Digital ID Pilot Aims to Give Somalis a Foothold in Formal Services",
      excerpt:
        "A government-backed digital identification pilot is being rolled out in select districts, aiming to give citizens without formal documentation easier access to banking, mobile registration and public services.",
      body: [
        "A government-backed digital identification pilot is being rolled out across several districts, aiming to give citizens who lack formal documentation easier access to banking, mobile-line registration and public services. Officials describe the programme as a foundational piece of longer-term plans to modernise civil registration after decades of disrupted record-keeping.",
        "The scale of the underlying problem is significant. Decades of conflict and displacement left much of Somalia's population without reliable birth records or national identification, complicating access to formal banking, property registration, and even routine SIM-card registration required under telecom regulations. Officials say the gap has pushed many transactions into informal channels that are harder to regulate and tax.",
        "The pilot uses biometric enrolment — fingerprints and a photograph — paired with a unique identification number, with registration teams travelling to district centres rather than requiring residents to travel to the capital. Early enrolment figures have exceeded projections in several districts, though officials caution that verifying identity for people without any prior documentation remains a slow, manual process.",
        "Privacy advocates have urged the government to publish clear data-protection rules governing how biometric information is stored and who can access it, noting that citizens in a country with a fraught history of state surveillance may have legitimate reservations about a centralised identity database. Officials say a legal framework is being finalised alongside the technical rollout.",
      ],
    },
    so: {
      title: "Tijaabada Aqoonsiga Dhijitaalka ah oo Loogu Talagalay in Soomaalidu ay Sanqadh ku Yeeshaan Adeegyada Rasmiga ah",
      excerpt:
        "Tijaabo aqoonsi dhijitaal ah oo dowladdu taageerto ayaa la fidinayaa degmooyin la doortay, iyadoo loogu talagalay in muwaadiniinta aan haysan dukumeenti rasmi ah ay si fudud ugu heli karaan adeegga bangiga, diiwaangelinta mobaylka iyo adeegyada dadweynaha.",
      body: [
        "Tijaabo aqoonsi dhijitaal ah oo dowladdu taageerto ayaa loo fidinayaa dhowr degmo, iyadoo loogu talagalay in muwaadiniinta aan haysan dukumeenti rasmi ah ay si fudud ugu heli karaan adeegga bangiga, diiwaangelinta khadka mobaylka iyo adeegyada dadweynaha. Saraakiishu waxay barnaamijka ku tilmaameen qayb aasaasi ah oo ka mid ah qorshayaasha muddo-dheer ee lagu casriyeynayo diiwaangelinta madaniga ah ka dib tobannaan sano oo diiwaan-hayntu ay carqaladaysnayd.",
        "Baaxadda dhibaatada hoosta taal waa mid weyn. Tobannaan sano oo colaad iyo barakac ah ayaa ka tagay in inta badan dadka Soomaaliyeed aysan haysan diiwaanno dhalasho oo la isku halayn karo ama aqoonsi qaran, taasoo dhib gelisay helitaanka adeegga bangiga rasmiga ah, diiwaangelinta hantida, iyo xitaa diiwaangelinta kaadhka SIM-ka ee caadiga ah ee lagu waajibiyay xeerarka telefoonka. Saraakiishu waxay sheegeen in farqigu uu u riixay macaamil badan qanaalo aan rasmi ahayn oo adag in la nidaamiyo lana canshuuro.",
        "Tijaabadu waxay isticmaashaa is-diiwaangelin baayoomeetari ah — faraha iyo sawir — oo lagu daray lambar aqoonsi oo gaar ah, iyadoo kooxaha diiwaangelintu ay u safraan xarumaha degmooyinka halkii ay dadku ugu safri lahaayeen caasimadda. Tirooyinka is-diiwaangelinta hore ayaa dhaafay filashadii degmooyin badan, in kastoo saraakiishu ay ka digeen in xaqiijinta aqoonsiga dadka aan haysan wax dukumeenti ah oo hore ay wali tahay geeddi-socod gaabis oo gacanta lagu qabto.",
        "U-doodayaasha sirta shakhsiga ayaa ku dhiirrigeliyay dowladda inay soo saarto xeerar cad oo ilaalinta xogta ah oo maamula sida macluumaadka baayoomeetariga loo kaydiyo iyo cidda geli karta, iyagoo xusay in muwaadiniinta dal leh taariikh xanuun leh oo kormeer dowladeed ah ay yeelan karaan sabab sharci ah oo ka welwelsan xog-bogagga aqoonsiga oo dhexdhexaad ah. Saraakiishu waxay sheegeen in qaab-dhismeed sharci lagu dhammaystirayo la socda fidinta farsamada.",
      ],
    },
    ar: {
      title: "برنامج تجريبي للهوية الرقمية يهدف لمنح الصوماليين موطئ قدم في الخدمات الرسمية",
      excerpt:
        "يُطرح برنامج تجريبي للهوية الرقمية بدعم حكومي في مقاطعات مختارة، بهدف منح المواطنين الذين لا يملكون وثائق رسمية وصولاً أسهل إلى الخدمات المصرفية وتسجيل الهاتف المحمول والخدمات العامة.",
      body: [
        "يُطرح برنامج تجريبي للهوية الرقمية بدعم حكومي عبر عدة مقاطعات، بهدف منح المواطنين الذين يفتقرون إلى وثائق رسمية وصولاً أسهل إلى الخدمات المصرفية وتسجيل خطوط الهاتف المحمول والخدمات العامة. ويصف المسؤولون البرنامج بأنه لبنة أساسية في خطط أطول أمداً لتحديث التسجيل المدني بعد عقود من اضطراب حفظ السجلات.",
        "وحجم المشكلة الكامنة كبير. فقد تركت عقود من الصراع والنزوح كثيراً من سكان الصومال دون سجلات ولادة موثوقة أو هوية وطنية، ما عقّد الوصول إلى الخدمات المصرفية الرسمية وتسجيل الممتلكات وحتى تسجيل شرائح الهاتف الروتيني المطلوب بموجب أنظمة الاتصالات. ويقول مسؤولون إن الفجوة دفعت معاملات كثيرة إلى قنوات غير رسمية يصعب تنظيمها وفرض الضرائب عليها.",
        "ويستخدم البرنامج التجريبي التسجيل البيومتري — بصمات الأصابع وصورة — مقروناً برقم هوية فريد، مع سفر فرق التسجيل إلى مراكز المقاطعات بدلاً من مطالبة السكان بالسفر إلى العاصمة. وتجاوزت أرقام التسجيل المبكرة التوقعات في عدة مقاطعات، رغم تحذير المسؤولين من أن التحقق من هوية أشخاص لا يملكون أي وثائق سابقة لا يزال عملية بطيئة ويدوية.",
        "وحثّ دعاة الخصوصية الحكومة على نشر قواعد واضحة لحماية البيانات تحكم كيفية تخزين المعلومات البيومترية ومن يمكنه الوصول إليها، مشيرين إلى أن مواطنين في بلد له تاريخ مضطرب مع المراقبة الحكومية قد تكون لديهم تحفظات مشروعة حيال قاعدة بيانات هوية مركزية. ويقول مسؤولون إن إطاراً قانونياً يجري وضع لمسته الأخيرة إلى جانب الطرح التقني.",
      ],
    },
  },

  // ============ TECHNOLOGY 12 ============
  {
    categoryKey: "technology",
    en: {
      title: "Telecom Regulator Issues New Spectrum Licences to Boost Rural Network Coverage",
      excerpt:
        "The National Communications Authority has allocated additional spectrum to operators committing to expand coverage in underserved rural districts, part of a broader push to close network gaps outside major cities.",
      body: [
        "Somalia's National Communications Authority has allocated additional wireless spectrum to telecom operators that commit to expanding network coverage in underserved rural districts, part of a broader regulatory push to close persistent connectivity gaps outside the country's major cities. The allocation ties access to premium spectrum bands to binding rural build-out commitments with enforceable timelines.",
        "Regulators say the approach reflects lessons from prior licensing rounds, where operators concentrated infrastructure investment in profitable urban markets while rural and semi-arid districts remained poorly served or entirely uncovered. The new framework includes coverage obligation clauses that were largely absent from earlier agreements.",
        "Operators have broadly welcomed the additional spectrum while noting that rural network expansion carries higher costs per subscriber given lower population density and, in some areas, ongoing security concerns that complicate tower maintenance. Industry representatives have called for complementary government support, such as tax incentives for rural infrastructure investment.",
        "Regulators say compliance with build-out commitments will be reviewed on an annual basis, with penalties for operators that fail to meet agreed milestones. Consumer advocacy groups have welcomed the accountability mechanism but cautioned that enforcement will be the true test of whether the policy translates into actual coverage on the ground.",
      ],
    },
    so: {
      title: "Xayndaabiyaha Telefoonka oo Bixiyay Shatiyo Cusub oo Baaxad-shabakadeed si loo Xoojiyo Daboolka Shabakadda Miyiga",
      excerpt:
        "Hay'adda Isgaarsiinta Qaranka ayaa u qoondaysay baaxad-shabakadeed dheeraad ah shirkadaha ballanqaada inay balaadhiyaan daboolka degmooyinka miyiga ee adeeg-yaraaday, qayb ka mid ah dadaal xayndaabineed oo ballaadhan oo lagu xirayo farqiga shabakadda ee ka baxsan magaalooyinka waaweyn.",
      body: [
        "Hay'adda Isgaarsiinta Qaranka ee Soomaaliya ayaa u qoondaysay baaxad-shabakadeed dheeraad ah shirkadaha telefoonka ee ballanqaada inay balaadhiyaan daboolka shabakadda degmooyinka miyiga ee adeeg-yaraaday, qayb ka mid ah dadaal xayndaabineed oo ballaadhan oo lagu xirayo farqiyada xiriirka ee joogtada ah ee ka baxsan magaalooyinka waaweyn ee dalka. Qoondaynta waxay ku xidhaa gelitaanka baaxad-shabakadeedka qaaliga ah ballanqaadyo balaadhin miyi oo xiran oo leh jadwallo la fulin karo.",
        "Xayndaabiyayaashu waxay sheegeen in habraacan uu ka tarjumayo casharro laga bartay wareegyadii shatiyaynta ee hore, halkaas oo shirkaduhu ay maalgelinta kaabayaasha ku ururiyeen suuqyada magaalada ee faa'iidada leh halka degmooyinka miyiga iyo kuwa qallalan ee dhexe ay sii ahaayeen kuwo si liidata loo adeegayo ama gebi ahaanba aan la daboolin. Qaab-dhismeedka cusub wuxuu ka kooban yahay qodobbo waajibaad daboolid ah oo inta badan ka maqnaa heshiisyadii hore.",
        "Shirkadaha ayaa si guud u soo dhaweeyay baaxad-shabakadeedka dheeraadka ah, iyagoo xusay in balaadhinta shabakadda miyigu ay wadato kharash sare oo isticmaale kasta, maadaama cufnaanta dadku ay hoosayso, meelaha qaarna ay jiraan welwel amni oo sii socda oo dhibaya dayactirka taabalada. Wakiillada warshaduhu waxay dalbadeen taageero dowladeed oo dhammaystirya, sida dhiirrigelin canshuureed oo loogu talagalay maalgelinta kaabayaasha miyiga.",
        "Xayndaabiyayaashu waxay sheegeen in la fulinta ballanqaadyada balaadhinta lagu qiimeynayo sanad walba, iyadoo cawaaqib xun loo hayo shirkadaha aan gaarin darajooyinka la isku raacay. Kooxaha u doodda macaamiisha ayaa ka faraxsan hab-maamuuska xisaabtanka laakiin waxay ka digeen in fulinta ay noqon doonto tijaabada dhabta ah ee muujinaysa in siyaasaddu ay u beddesho daboolid dhab ah oo dhulka ah.",
      ],
    },
    ar: {
      title: "الجهة المنظمة للاتصالات تصدر تراخيص طيف جديدة لتعزيز تغطية الشبكة الريفية",
      excerpt:
        "خصّصت الهيئة الوطنية للاتصالات طيفاً إضافياً لمشغّلين يلتزمون بتوسيع التغطية في مقاطعات ريفية ناقصة الخدمة، ضمن دفعة أوسع لسد فجوات الشبكة خارج المدن الكبرى.",
      body: [
        "خصّصت الهيئة الوطنية للاتصالات في الصومال طيفاً لاسلكياً إضافياً لمشغّلي الاتصالات الذين يلتزمون بتوسيع تغطية الشبكة في مقاطعات ريفية ناقصة الخدمة، ضمن دفعة تنظيمية أوسع لسد فجوات الاتصال المستمرة خارج المدن الكبرى في البلاد. ويربط التخصيص الوصول إلى نطاقات طيف متميزة بالتزامات ملزمة لبناء شبكات ريفية بجداول زمنية قابلة للتنفيذ.",
        "ويقول منظمون إن النهج يعكس دروساً مستفادة من جولات ترخيص سابقة، حيث ركّز المشغّلون استثمارات البنية التحتية في الأسواق الحضرية المربحة بينما بقيت المقاطعات الريفية وشبه القاحلة سيئة الخدمة أو غير مغطاة إطلاقاً. ويتضمن الإطار الجديد بنود التزام بالتغطية كانت غائبة إلى حد كبير عن اتفاقيات سابقة.",
        "ورحّب المشغّلون عموماً بالطيف الإضافي مع إشارتهم إلى أن توسيع الشبكة الريفية يحمل تكاليف أعلى لكل مشترك نظراً لانخفاض الكثافة السكانية، وفي بعض المناطق، مخاوف أمنية مستمرة تعقّد صيانة الأبراج. ودعا ممثلو القطاع إلى دعم حكومي مكمّل، مثل حوافز ضريبية للاستثمار في البنية التحتية الريفية.",
        "ويقول المنظمون إن الامتثال لالتزامات البناء سيُراجَع سنوياً، مع فرض عقوبات على المشغّلين الذين لا يحققون المعالم المتفق عليها. ورحّبت جماعات الدفاع عن المستهلك بآلية المساءلة لكنها حذّرت من أن التنفيذ سيكون الاختبار الحقيقي لما إذا كانت السياسة ستُترجم إلى تغطية فعلية على أرض الواقع.",
      ],
    },
  },

  // ============ LOCAL NEWS 1 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Deepening Drought Displaces Tens of Thousands as Somalia's Hunger Crisis Grows",
      excerpt:
        "Aid agencies warn that failed rains and an unusually harsh dry season have pushed nearly one in three Somalis toward crisis levels of hunger, with children the most severely affected.",
      body: [
        "Somalia is confronting one of its most severe drought emergencies in recent memory, as failed rains and an exceptionally harsh dry season drive hunger, malnutrition and displacement to alarming levels. Humanitarian agencies say the crisis has moved from early warning to full-scale emergency, with the Integrated Food Security Phase Classification projecting that around 6.5 million people — nearly one in three Somalis — could face crisis levels of hunger or worse.",
        "The human toll is falling hardest on the most vulnerable. Roughly two million people are expected to face emergency conditions, and an estimated 1.8 million children under five are projected to suffer acute malnutrition this year, including nearly half a million facing its most severe and life-threatening form. In the early months of the year, tens of thousands of people were newly displaced within weeks across the Mudug and Banadir regions alone.",
        "The United Nations humanitarian office has warned that overlapping pressures — reduced rainfall, recurring climate shocks, conflict and declining donor funding — are compounding one another. Rural and pastoralist communities, dependent on livestock and scarce water sources, remain among the worst hit, and forced displacement has swelled camps around major towns.",
        "Aid organisations caution that the danger is not confined to drought. Analysts have highlighted the risk of a double shock, in which parched ground gives way to sudden flooding when rains do arrive, destroying crops and infrastructure. With funding falling short of need, agencies warn that without timely assistance the country faces the prospect of rising, preventable deaths.",
        "Local officials in the worst-affected districts say makeshift camps are already stretching water and sanitation services well beyond capacity, and have appealed for emergency trucking of water even as longer-term relief efforts are organised.",
      ],
    },
    so: {
      title: "Abaar Sii Xumaanaysa oo Barakicisay Tobannaan Kun oo Qof iyadoo Xaaladda Gaajada Soomaaliya Sii Ballaadhaysa",
      excerpt:
        "Hay'adaha gargaarku waxay ka digayaan in roobab la waayay iyo xilli abaareed aad u daran ay u riixeen ku dhawaad saddex-meelood meel Soomaalida heerar gaaja oo halis ah, carruurtuna ay tahay kuwa ugu daran saameeya.",
      body: [
        "Soomaaliya waxay wajahaysaa mid ka mid ah xaaladaha abaareed ee ugu daran ee dhawaan la xasuusto, iyadoo roobab la waayay iyo xilli abaareed aad u daran ay gaajada, nafaqo-darrada iyo barakaca u kaxeeyaan heerar cabsi leh. Hay'adaha bini'aadantinimadu waxay sheegayaan in azabku ka guuray digniin hore una gudbay xaalad degdeg ah oo buuxda, iyadoo Kala-saarista Heerarka Amniga Cuntada ee Isku-dhafan ay saadaalinayso in qiyaastii 6.5 milyan oo qof — ku dhawaad saddex-meelood meel Soomaalida — ay la kulmi karaan heerar gaaja oo halis ah ama ka daran.",
        "Khasaaraha aadanaha ayaa si adag ugu dhacaya kuwa ugu nugul. Qiyaastii laba milyan oo qof ayaa la filayaa inay la kulmaan xaalado degdeg ah, qiyaastii 1.8 milyan oo carruur ah oo ka yar shan sano ayaa la saadaalinayaa inay la kulmaan nafaqo-darro daran sanadkan, oo ay ku jiraan ku dhawaad badh milyan oo wajahaya qaabkeeda ugu daran ee naf-haliseed. Bilihii hore ee sanadka, tobannaan kun oo qof ayaa la barakiciyay asbuucyo gudahood gobollada Mudug iyo Banaadir oo keliya.",
        "Xafiiska bini'aadantinimada ee Qaramada Midoobay ayaa ka digay in cadaadisyo isdulsaaran — roob-yaraan, naaftooyin cimilo oo soo noqnoqda, colaad iyo maalgelin deeq-bixiyeyaal oo hoos u dhacaysa — ay is-kordhinayaan. Bulshooyinka miyiga iyo reer-guuraaga ah, ee ku tiirsan xoolaha iyo ilo biyo oo yar, waxay wali ka mid yihiin kuwa ugu daran saameeyay, barakaca qasabka ahna wuxuu buuxiyay xerooyinka ku hareeraysan magaalooyinka waaweyn.",
        "Ururrada gargaarku waxay ka digayaan in halisku aanay ku koobnayn abaarta. Falanqeeyayaashu waxay iftiimiyeen khatarta naafto-labeed, oo dhulka engegan uu meel u banaynayo daad kedis ah markii roobku yimaado, taasoo baabbi'inaysa dalagga iyo kaabayaasha. Iyadoo maalgelintu ay ka gaaban tahay baahida, hay'aduhu waxay ka digayaan in la'aanta gargaar waqti ku habboon dalku uu la kulmi karo dhimasho sii kordhaysa oo la ka-hortagi karo.",
        "Saraakiisha maxalliga ah ee degmooyinka ugu daran saameeya ayaa sheegay in xerooyinka degdegga ah ay hore u soo koobeen adeegyada biyaha iyo nadaafadda si aad ah oo dhaafay awoodda, waxayna baryeen in si degdeg ah biyo loogu gaadho gawaarida xitaa iyadoo dadaallada gargaarka muddo-dheer la abaabulayo.",
      ],
    },
    ar: {
      title: "الجفاف المتفاقم يشرّد عشرات الآلاف مع تنامي أزمة الجوع في الصومال",
      excerpt:
        "تحذّر وكالات الإغاثة من أن غياب الأمطار وموسم جفاف قاسٍ بشكل غير معتاد دفعا نحو ثلث الصوماليين إلى مستويات أزمة من الجوع، والأطفال هم الأكثر تضرراً.",
      body: [
        "يواجه الصومال واحدة من أشد حالات طوارئ الجفاف في الذاكرة القريبة، إذ يدفع غياب الأمطار وموسم جفاف قاسٍ بشكل استثنائي الجوع وسوء التغذية والنزوح إلى مستويات مقلقة. وتقول وكالات إنسانية إن الأزمة انتقلت من الإنذار المبكر إلى حالة طوارئ كاملة، مع توقّع التصنيف المرحلي المتكامل للأمن الغذائي أن نحو 6.5 مليون شخص — قرابة ثلث الصوماليين — قد يواجهون مستويات أزمة من الجوع أو أسوأ.",
        "وتقع الخسائر البشرية بأشد وطأتها على الأكثر ضعفاً. فمن المتوقع أن يواجه نحو مليوني شخص ظروف طوارئ، ويُقدَّر أن يعاني نحو 1.8 مليون طفل دون سن الخامسة من سوء تغذية حاد هذا العام، بينهم قرابة نصف مليون يواجهون أشد أشكاله خطورةً على الحياة. وفي الأشهر الأولى من العام، نزح عشرات الآلاف حديثاً في غضون أسابيع في إقليمَي مدج وبنادر وحدهما.",
        "وحذّر مكتب الأمم المتحدة للشؤون الإنسانية من أن ضغوطاً متداخلة — تراجع الأمطار، والصدمات المناخية المتكررة، والصراع، وتراجع تمويل المانحين — يفاقم بعضها بعضاً. ولا تزال المجتمعات الريفية والرعوية، المعتمدة على الماشية ومصادر المياه الشحيحة، من بين الأشد تضرراً، وقد ضخّم النزوح القسري المخيمات حول البلدات الكبرى.",
        "وتحذّر منظمات الإغاثة من أن الخطر لا يقتصر على الجفاف. فقد سلّط المحللون الضوء على خطر صدمة مزدوجة، تفسح فيها الأرض المتشققة المجال لفيضانات مفاجئة حين تصل الأمطار، فتدمّر المحاصيل والبنية التحتية. ومع قصور التمويل عن الحاجة، تحذّر الوكالات من أنه دون مساعدة في الوقت المناسب يواجه البلد احتمال ارتفاع وفيات يمكن الوقاية منها.",
        "ويقول مسؤولون محليون في أشد المقاطعات تضرراً إن المخيمات المؤقتة تُرهق بالفعل خدمات المياه والصرف الصحي إلى ما هو أبعد من طاقتها، وناشدوا بنقل مياه طارئ بالشاحنات حتى مع تنظيم جهود إغاثة أطول أمداً.",
      ],
    },
  },

  // ============ LOCAL NEWS 2 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Restoration of Mogadishu's Historic Landmarks Sparks Renewed Civic Pride",
      excerpt:
        "Efforts to restore old buildings and public spaces in the capital are drawing residents back to a shared heritage long overshadowed by conflict.",
      body: [
        "In Mogadishu, efforts to restore historic buildings and public spaces are drawing residents back to a shared civic heritage long overshadowed by decades of conflict. Old structures that survived the years of upheaval are being repaired, and public squares once avoided are slowly returning to use.",
        "The city carries deep layers of history, from its role as an ancient trading port to the distinctive architecture of later eras. Much was damaged or neglected during the long years of instability. For many residents, seeing these landmarks cared for again is about more than aesthetics — it is a reclaiming of identity and continuity.",
        "Restoration is painstaking and often underfunded work, dependent on a mix of public initiative, private effort, and community involvement. Preservationists face difficult choices about what to prioritise and how to balance restoration with the pressing needs of a growing city that also requires new housing, services, and infrastructure.",
        "Yet the symbolic weight is considerable. Each restored building and reopened space offers a visible sign that the city is not only rebuilding but remembering — knitting together past and present. For a generation that grew up amid ruin, these landmarks can serve as anchors, reminders that the city has a history worth carrying forward.",
      ],
    },
    so: {
      title: "Dib-u-cusboonaysiinta Calaamadaha Taariikhiga ah ee Muqdisho oo Kicisay Kibir Madani oo Cusub",
      excerpt:
        "Dadaallada lagu dib-u-cusboonaysiinayo dhismayaasha hore iyo goobaha dadweynaha ee caasimadda ayaa dib u soo celinaya dadka deggan hidde wadaag ah oo muddo dheer colaaddu hadhaysay.",
      body: [
        "Muqdisho, dadaallada lagu dib-u-cusboonaysiinayo dhismayaasha taariikhiga ah iyo goobaha dadweynaha ayaa dib u soo celinaya dadka deggan hidde madani oo wadaag ah oo muddo tobannaan sano oo colaad ah hadhaysay. Dhismayaashii hore ee ka badbaaday sannadihii kacdoonka ayaa la hagaajinayaa, fagaarayaashii dadweynaha ee mar laga fogaan jiray ayaa si tartiib ah dib ugu soo laabanaya isticmaal.",
        "Magaaladu waxay xambaartaa lakabyo qoto dheer oo taariikh ah, laga bilaabo doorkeeda dekad ganacsi oo qadiim ah ilaa naqshadeynta gaarka ah ee xilliyadii dambe. Wax badan ayaa la dhaawacay ama la dayacay sannadihii dheeraa ee xasillooni-darrada. Dad badan oo deggan, arkista calaamadahan oo dib loo daryeelay waxay ka badan tahay quruxda — waa dib-u-qaadasho aqoonsi iyo sii-socod.",
        "Dib-u-cusboonaysiintu waa shaqo taxaddar leh oo inta badan aan la maalgelin, oo ku tiirsan isku-dhafka hindise dadweyne, dadaal gaar ah, iyo ka-qaybgalka bulshada. Ilaaliyeyaashu waxay wajahayaan doorashooyin adag oo ku saabsan waxa la mudnaan siinayo iyo sida dib-u-cusboonaysiinta lagu dheellitiraa baahiyaha degdegga ah ee magaalo sii kortay oo sidoo kale u baahan guryo cusub, adeegyo, iyo kaabayaal.",
        "Haddana culeyska astaanta ah waa mid weyn. Dhisme kasta oo la cusboonaysiiyay iyo goob dib loo furay waxay bixisaa calaamad muuqata oo ah in magaaladu aysan oo kaliya dib u dhisayn laakiin ay xasuusanayso — isku xirista hore iyo hadda. Jiil ku koray dhexe burbur, calaamadahani waxay u adeegi karaan barroosinno, xasuusinno ah in magaaladu leedahay taariikh mudan in la sii wado.",
      ],
    },
    ar: {
      title: "ترميم معالم مقديشو التاريخية يشعل فخراً مدنياً متجدداً",
      excerpt:
        "جهود ترميم المباني القديمة والأماكن العامة في العاصمة تعيد السكان إلى تراث مشترك طالما حجبه الصراع.",
      body: [
        "في مقديشو، تعيد جهود ترميم المباني التاريخية والأماكن العامة السكان إلى تراث مدني مشترك طالما حجبته عقود من الصراع. فالمباني القديمة التي نجت من سنوات الاضطراب تُرمَّم، والساحات العامة التي كانت تُتجنّب تعود ببطء إلى الاستخدام.",
        "تحمل المدينة طبقات عميقة من التاريخ، من دورها ميناءً تجارياً قديماً إلى العمارة المميزة لعصور لاحقة. وقد تضرّر كثير منها أو أُهمل خلال سنوات عدم الاستقرار الطويلة. وبالنسبة لكثير من السكان، فإن رؤية هذه المعالم تُعتنى بها من جديد أمر يتجاوز الجماليات — إنه استعادة للهوية والاستمرارية.",
        "الترميم عمل شاق وغالباً ناقص التمويل، يعتمد على مزيج من المبادرة العامة والجهد الخاص ومشاركة المجتمع. ويواجه دعاة الحفظ خيارات صعبة بشأن ما يُعطى الأولوية وكيفية الموازنة بين الترميم والاحتياجات الملحّة لمدينة نامية تحتاج أيضاً إلى مساكن وخدمات وبنية تحتية جديدة.",
        "ومع ذلك، فإن الوزن الرمزي كبير. فكل مبنى مُرمَّم ومساحة أُعيد فتحها يقدّم علامة مرئية على أن المدينة لا تعيد البناء فحسب بل تتذكّر — تنسج معاً الماضي والحاضر. وبالنسبة لجيل نشأ وسط الخراب، يمكن أن تكون هذه المعالم مراسيَ، وتذكيرات بأن للمدينة تاريخاً يستحق المضي به قُدُماً.",
      ],
    },
  },

  // ============ LOCAL NEWS 3 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Seasonal Flooding Along the Shabelle River Displaces Riverine Communities",
      excerpt:
        "Heavy rains upstream have pushed the Shabelle River past flood stage in several districts, forcing riverine farming communities to evacuate and destroying stretches of recently planted cropland.",
      body: [
        "Heavy rains upstream have pushed the Shabelle River past flood stage in several districts, forcing riverine farming communities to evacuate low-lying settlements and destroying stretches of recently planted cropland just weeks before an anticipated harvest. Local officials say the flooding follows a familiar and painful pattern for communities along the river who alternate between drought and flood with little in between.",
        "Displacement camps have sprung up on higher ground near several towns, straining already limited access to clean water and sanitation. Aid workers report that many of the displaced are the same families who were affected by drought conditions only months earlier, having only recently returned to their farms.",
        "Agricultural officials estimate that a significant share of this season's riverine crop has been lost or damaged, a blow to a region considered one of the country's more reliable food-producing areas precisely because of its access to river water. The loss raises concerns about food availability in the months ahead, even as national attention remains focused on drought-affected areas elsewhere.",
        "Community leaders have called for faster investment in flood-control infrastructure, including embankment repairs that have been delayed for years due to funding shortfalls, arguing that predictable seasonal flooding should not repeatedly catch response systems unprepared.",
      ],
    },
    so: {
      title: "Daadadka Xilliyeed ee Webiga Shabeelle oo Barakiciyay Bulshooyinka Webiga Ku Nool",
      excerpt:
        "Roobabka culus ee kor-webiga ka da'ay ayaa u riixay Webiga Shabeelle heerkii daadka dhowr degmo, taasoo ku qasabtay bulshooyinka beeraha webiga ku nool inay guuraan waxayna baabbi'isay dhul beero oo dhawaan la beeray.",
      body: [
        "Roobabka culus ee kor-webiga ka da'ay ayaa u riixay Webiga Shabeelle heerkii daadka dhowr degmo, taasoo ku qasabtay bulshooyinka beeraha webiga ku nool inay ka guuraan degsiimooyinka hoose waxayna baabbi'isay dhul beero oo dhawaan la beeray dhawr toddobaad ka hor beergooyska la filayay. Saraakiisha maxalliga ah waxay sheegeen in daadku uu raacayo qaab la yaqaan oo xanuun leh oo u ah bulshooyinka webiga ku nool ee kala dhexeeya abaar iyo daad iyada oo aan wax badan udhaxeynin.",
        "Xerooyin barakac ah ayaa ka soo baxay dhulka sare ee ku dhow dhowr magaalo, taasoo cadaadis ku dartay adeegyada biyaha nadiifka ah iyo nadaafadda oo hore u xaddidnaa. Shaqaalaha gargaarku waxay sheegeen in qoysas badan oo la barakiciyay ay yihiin isla kuwii saameeyay xaaladihii abaarta dhawr bilood ka hor, iyagoo dhawaan ku soo laaban beerahoodii.",
        "Saraakiisha beeraha ayaa qiyaasay in qayb weyn oo dalagga webiga xilligan la lumiyay ama la dhaawacay, dhaawac ku dhacay gobol loo tixgeliyo mid ka mid ah kuwa dalka ugu wax-soo-saarka cuntada ku kalsoonaan badan sababtoo ah gelitaankiisa biyaha webiga. Khasaaruhu wuxuu kiciyay welwel ku saabsan helitaanka cuntada bilaha soo socda, xitaa iyadoo dareenka qaranku uu wali diirad saarayo aagagga abaartu saameysay meelaha kale.",
        "Hoggaamiyeyaasha bulshadu waxay dalbadeen maalgelin degdeg ah oo lagu darsan karo kaabayaasha xakamaynta daadka, oo ay ku jiraan dayactirka biyo-xidhaha oo dib loo dhigay sanado maalgelin-yari awgeed, iyagoo ku dooda in daadadka xilliyeed ee la saadaalin karo aanay mar kasta ku qaban karin nidaamyada jawaabta iyagoon diyaar ahayn.",
      ],
    },
    ar: {
      title: "فيضانات موسمية على نهر شبيلي تشرّد مجتمعات نهرية",
      excerpt:
        "دفعت أمطار غزيرة أعلى المجرى نهر شبيلي إلى ما فوق منسوب الفيضان في عدة مقاطعات، ما أجبر مجتمعات زراعية نهرية على الإخلاء ودمّر مساحات من أراضٍ زُرعت حديثاً.",
      body: [
        "دفعت أمطار غزيرة أعلى المجرى نهر شبيلي إلى ما فوق منسوب الفيضان في عدة مقاطعات، ما أجبر مجتمعات زراعية نهرية على إخلاء المستوطنات المنخفضة ودمّر مساحات من أراضٍ زُرعت حديثاً قبل أسابيع فقط من حصاد متوقع. ويقول مسؤولون محليون إن الفيضان يتبع نمطاً مألوفاً ومؤلماً لمجتمعات على طول النهر تتناوب بين الجفاف والفيضان دون كثير بينهما.",
        "وظهرت مخيمات نزوح على أراضٍ مرتفعة قرب عدة بلدات، ما يزيد الضغط على وصول محدود أصلاً إلى مياه نظيفة وصرف صحي. ويفيد عاملو الإغاثة بأن كثيراً من النازحين هم نفس الأسر التي تضررت من ظروف الجفاف قبل أشهر فقط، وقد عادت لتوها إلى مزارعها.",
        "ويقدّر مسؤولون زراعيون أن حصة كبيرة من محصول هذا الموسم النهري فُقدت أو تضررت، وهي ضربة لمنطقة تُعد من بين أكثر مناطق إنتاج الغذاء موثوقية في البلاد بالضبط بسبب وصولها إلى مياه النهر. ويثير الفقدان مخاوف بشأن توفر الغذاء في الأشهر المقبلة، حتى مع بقاء الاهتمام الوطني مركزاً على مناطق متضررة من الجفاف في أماكن أخرى.",
        "ودعا قادة المجتمع إلى استثمار أسرع في بنية تحتية للتحكم بالفيضانات، بما في ذلك إصلاحات جسور تأخرت لسنوات بسبب نقص التمويل، مجادلين بأن الفيضانات الموسمية القابلة للتنبؤ لا ينبغي أن تفاجئ أنظمة الاستجابة مراراً وهي غير مستعدة.",
      ],
    },
  },

  // ============ LOCAL NEWS 4 ============
  {
    categoryKey: "local-news",
    en: {
      title: "New Maternal Health Wing Opens at Regional Hospital, Easing Pressure on Overstretched Ward",
      excerpt:
        "A newly completed maternal and newborn health wing at a regional hospital aims to reduce dangerously high rates of complications during childbirth in a district that previously had limited specialised care.",
      body: [
        "A newly completed maternal and newborn health wing opened its doors at a regional hospital this month, aiming to reduce dangerously high rates of complications during childbirth in a district that previously had limited access to specialised maternal care. The expansion adds delivery rooms, a small neonatal unit, and additional beds to a facility that had long operated well beyond its intended capacity.",
        "Hospital administrators say the previous maternity ward, built to handle a fraction of current patient volume, had become a source of serious concern as the district's population grew and surrounding rural clinics referred complicated cases with increasing frequency. Health workers describe conditions before the expansion as routinely overcrowded, with patients at times sharing beds during peak periods.",
        "The project was funded through a combination of government capital spending and international health partners, and includes training for additional midwives and neonatal nurses to staff the expanded facility. Officials say retaining trained staff in the region, rather than losing them to better-resourced hospitals in the capital, remains an ongoing challenge.",
        "Community health workers say the new wing is already visible in reduced referral times for complicated deliveries, though they caution that broader improvements in maternal health outcomes will depend on parallel investment in rural antenatal care and transport links to the hospital.",
      ],
    },
    so: {
      title: "Qayb Cusub oo Caafimaadka Hooyada ah oo ka Furmay Isbitaalka Gobolka, Taasoo Yareysay Cadaadiska Qaybta Xad-dhaafka ah",
      excerpt:
        "Qayb cusub oo caafimaadka hooyada iyo dhallaanka ah oo dhammaatay oo isbitaal gobol ku yaal ayaa lagu doonayaa in la yareeyo heerarka khatarta badan ee dhibaatooyinka ka dhasha dhalmada degmo hore u lahayd daryeel takhasus leh oo xaddidan.",
      body: [
        "Qayb cusub oo caafimaadka hooyada iyo dhallaanka ah oo dhammaatay ayaa albaabbadeeda ka furtay isbitaal gobol bishan, iyadoo lagu doonayo in la yareeyo heerarka khatarta badan ee dhibaatooyinka ka dhasha dhalmada degmo hore u lahayd gelitaan xaddidan oo daryeel hooyo oo takhasus leh. Ballaadhintu waxay ku darsaneysaa qolal dhalmo, qayb yar oo dhallaanka daryeela, iyo sariiro dheeraad ah oo lagu daray xarun muddo dheer ka shaqaynaysay wax ka baxsan awoodda loogu talagalay.",
        "Maamulayaasha isbitaalka waxay sheegeen in qaybtii dhalmada ee hore, oo loo dhisay in ay maareyso qayb yar oo kaliya oo ah dadka bukaan-socodka ee hadda jira, ay noqotay isha welwel weyn maadaama dadka degmadu ay korayeen iyo isbitaallada miyiga ee ku hareeraysan ay marar sii kordheysa u gudbinayeen kiisaska adag. Shaqaalaha caafimaaduhu waxay sheegeen in xaaladaha ka hor ballaadhintu ay ahaayeen kuwo si joogto ah u cidhiidhsan, iyadoo bukaan-socodku ay marmar wadaageen sariir xilliyada ugu culus.",
        "Mashruucu wuxuu ku maalgeliyay isku-dhaf ka kooban kharashka maalgelinta dowladda iyo shurakada caafimaadka caalamiga ah, wuxuuna ka koobanyahay tababar loogu talagalay umulisooyin dheeraad ah iyo kalkaalisooyin dhallaanka si loogu shaqaaleeyo xarunta la ballaadhiyay. Saraakiishu waxay sheegeen in ku hayn shaqaale la tababaray gobolka, halkii ay uga lumin lahaayeen isbitaallada kheyraadka badan ee caasimadda, ay weli tahay caqabad joogto ah.",
        "Shaqaalaha caafimaadka bulshada ayaa sheegay in qaybta cusub hore loo arki karo waqti gudbinta oo yaraaday kiisaska dhalmada ee adag, in kastoo ay ka digeen in horumar ballaadhan oo ku yimaada natiijooyinka caafimaadka hooyada uu ku xiran doono maalgelin isku-dheelli ah oo lagu daro daryeelka uurka miyiga iyo xiriirrada gaadiidka ee isbitaalka.",
      ],
    },
    ar: {
      title: "جناح جديد لصحة الأمومة يفتتح في مستشفى إقليمي، يخفف الضغط عن جناح مثقل بالأعباء",
      excerpt:
        "يهدف جناح جديد لصحة الأم والوليد اكتمل بناؤه في مستشفى إقليمي إلى خفض معدلات مرتفعة بشكل خطير من مضاعفات الولادة في مقاطعة كانت رعايتها التخصصية محدودة سابقاً.",
      body: [
        "افتتح جناح جديد لصحة الأم والوليد اكتمل بناؤه هذا الشهر أبوابه في مستشفى إقليمي، بهدف خفض معدلات مرتفعة بشكل خطير من مضاعفات الولادة في مقاطعة كان وصولها إلى رعاية أمومة تخصصية محدوداً سابقاً. ويضيف التوسع غرف ولادة ووحدة صغيرة لحديثي الولادة وأسرّة إضافية إلى مرفق كان يعمل منذ فترة طويلة بما يتجاوز طاقته المقصودة بكثير.",
        "ويقول إداريو المستشفى إن جناح الولادة السابق، الذي بُني لاستيعاب جزء بسيط من حجم المرضى الحالي، أصبح مصدر قلق جدي مع نمو سكان المقاطعة وإحالة العيادات الريفية المحيطة حالات معقدة بتكرار متزايد. ويصف العاملون الصحيون الظروف قبل التوسع بأنها كانت مكتظة بشكل روتيني، مع تشارك المرضى أحياناً الأسرّة في فترات الذروة.",
        "ومُوِّل المشروع من خلال مزيج من الإنفاق الرأسمالي الحكومي وشركاء صحيين دوليين، ويشمل تدريب قابلات وممرضات حديثي ولادة إضافيات لتزويد المرفق الموسّع بالكوادر. ويقول مسؤولون إن الاحتفاظ بالكوادر المدرَّبة في المنطقة، بدلاً من خسارتها لصالح مستشفيات أوفر موارد في العاصمة، لا يزال تحدياً مستمراً.",
        "ويقول عاملون في الصحة المجتمعية إن الجناح الجديد ظهر أثره بالفعل في تقليص أوقات الإحالة لحالات الولادة المعقدة، رغم تحذيرهم من أن تحسينات أوسع في نتائج صحة الأمومة ستعتمد على استثمار موازٍ في رعاية ما قبل الولادة الريفية وروابط النقل إلى المستشفى.",
      ],
    },
  },

  // ============ LOCAL NEWS 5 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Coastal Fishing Communities Report Rising Catches as Cold-Storage Investment Pays Off",
      excerpt:
        "Fishermen along Somalia's Indian Ocean coast say new cold-storage facilities and improved market access are helping them sell more of their catch at better prices rather than losing it to spoilage.",
      body: [
        "Fishermen along Somalia's long Indian Ocean coastline report rising catches and improved incomes this season, a shift local cooperative leaders attribute in part to newly built cold-storage facilities that allow fish to be preserved rather than sold hastily at depressed prices before it spoils. For a country with one of the longest coastlines in Africa but a historically underdeveloped fishing sector, the change marks a notable shift.",
        "For decades, Somalia's artisanal fishing communities have struggled to translate abundant marine resources into reliable income, hampered by a lack of ice and refrigeration that forced fishermen to sell their entire catch within hours of returning to shore, regardless of market conditions. Cooperative leaders say the new facilities, several funded through a mix of diaspora investment and development partnerships, have given fishermen leverage to hold catch until buyers offer fair prices.",
        "The improvements have coincided with growing domestic demand for fish as an affordable protein source amid rising costs for other staples, and cooperative leaders say some communities have begun exploring modest export arrangements to regional markets for the first time. Processing and packaging capacity, however, remains limited, and much of the catch is still sold fresh rather than value-added.",
        "Fishing communities caution that gains remain fragile. Illegal foreign fishing vessels continue to be reported off the coast, competing for the same stocks, and the sector still lacks basic infrastructure such as reliable landing sites and paved access roads in many areas. Local leaders have called for continued investment to consolidate the recent progress.",
      ],
    },
    so: {
      title: "Bulshooyinka Kalluumeysiga Xeebaha ah oo Warbixin ka Bixiyay Kalluumo Kordhay iyadoo Maalgelinta Qabowga ay Faa'iido Keentay",
      excerpt:
        "Kalluumeystayaasha xeebta Badweynta Hindiya ee Soomaaliya ayaa sheegay in xarumaha kaydinta qabow ee cusub iyo gelitaanka suuqa oo hagaagay ay ka caawinayaan inay iibiyaan qayb ka badan kalluunkooda qiimo wanaagsan halkii ay uga lumin lahaayeen kharibid.",
      body: [
        "Kalluumeystayaasha xeebta dheer ee Badweynta Hindiya ee Soomaaliya ayaa warbixin ka bixiyay kalluumo kordhay iyo dakhli hagaagay xilligan, isbeddel ay hoggaamiyeyaasha iskaashatooyinka maxalliga ah ay dhinac ka aaneen xarumaha kaydinta qabow ee dhawaan la dhisay oo u oggolaanaya in kalluunka la kaydiyo halkii si degdeg ah loogu iibin lahaa qiimayaal hoos u dhacay ka hor inta uusan kharibin. Dal leh mid ka mid ah xeebaha ugu dhaadheer Afrika laakiin taariikh ahaan leh qayb kalluumeysi oo aan si buuxda u horumarin, isbeddelku wuxuu calaamadaynayaa isbeddel muuqda.",
        "Tobannaan sano, bulshooyinka kalluumeysiga hab-dhaqameedka ah ee Soomaaliya waxay ku dhibtoodeen inay kheyraadka badweynta ee badan u beddelaan dakhli la isku halayn karo, iyagoo caqabad ku ahaa la'aanta baraf iyo qabow oo ku qasbay kalluumeystayaasha inay iibiyaan kalluunkooda oo dhan saacado gudahood ka dib markay xeebta ku soo laabtaan, iyadoon loo eegin xaaladaha suuqa. Hoggaamiyeyaasha iskaashatooyinka ayaa sheegay in xarumaha cusub, oo dhowr ka mid ah lagu maalgeliyay isku-dhaf ka kooban maalgelinta qurbaha iyo iskaashiyada horumarineed, ay siiyeen kalluumeystayaasha awood ay ku hayaan kalluunka ilaa iibsadayaashu ay bixiyaan qiimayaal cadaalad ah.",
        "Hagaajinta waxay isku dhacday koritaan ku yimid baahida guriga ee kalluunka sida isha borotinka la iibsan karo xilli qiimayaasha cuntooyinka kale ay sare u kacayaan, hoggaamiyeyaasha iskaashatooyinka ayaa sheegay in bulshooyin qaarkood ay bilaabeen inay baadhaan hab-dhaqameedyo dhoofin oo yar oo la geeyo suuqyada gobolka markii ugu horreysay. Awoodda farsameynta iyo baakadeynta, si kastaba, ayaa weli xaddidan, badankiisa kalluunkuna wali waxaa loo iibiyaa cusub halkii qiimo lagu darin lahaa.",
        "Bulshooyinka kalluumeysigu waxay ka digayaan in faa'iidooyinku ay weli jilicsan yihiin. Doomaha kalluumeysiga shisheeye ee sharci-darrada ah ayaa wali laga soo warbixinayaa xeebta, iyagoo tartamaya isku kaydka kalluunka, qaybtuna weli waxay ka maqan tahay kaabayaal aasaasi ah sida goobo saarid kalluun oo la isku halayn karo iyo waddooyin la geli karo oo saldhig leh meelo badan. Hoggaamiyeyaasha maxalliga ah ayaa dalbaday maalgelin sii socota si loo xoojiyo horumarka dhawaan la sameeyay.",
      ],
    },
    ar: {
      title: "مجتمعات صيد ساحلية تُبلغ عن ارتفاع الصيد مع نجاح الاستثمار في التبريد",
      excerpt:
        "يقول صيادون على ساحل المحيط الهندي الصومالي إن مرافق تبريد جديدة ووصولاً أفضل للأسواق تساعدهم على بيع كمية أكبر من صيدهم بأسعار أفضل بدلاً من خسارته بسبب التلف.",
      body: [
        "يُبلغ صيادون على طول ساحل المحيط الهندي الصومالي الطويل عن ارتفاع في الصيد وتحسّن الدخل هذا الموسم، وهو تحول يعزوه قادة تعاونيات محلية جزئياً إلى مرافق تبريد بُنيت حديثاً تسمح بحفظ الأسماك بدلاً من بيعها على عجل بأسعار متدنية قبل أن تتلف. وبالنسبة لبلد يملك واحداً من أطول السواحل في أفريقيا لكن قطاع صيده كان تاريخياً ناقص التطور، يمثّل التحول تغيّراً ملحوظاً.",
        "لعقود، كافحت مجتمعات الصيد الحرفي في الصومال لتحويل موارد بحرية وفيرة إلى دخل موثوق، معرقلة بنقص الثلج والتبريد الذي أجبر الصيادين على بيع كامل صيدهم في غضون ساعات من العودة إلى الشاطئ، بصرف النظر عن ظروف السوق. ويقول قادة تعاونيات إن المرافق الجديدة، التي مُوِّل عدد منها بمزيج من استثمار الشتات وشراكات تنموية، منحت الصيادين قدرة على الاحتفاظ بالصيد حتى يعرض المشترون أسعاراً عادلة.",
        "وتزامنت التحسينات مع طلب محلي متنامٍ على السمك كمصدر بروتين ميسور التكلفة وسط ارتفاع تكاليف سلع أساسية أخرى، ويقول قادة تعاونيات إن بعض المجتمعات بدأت تستكشف ترتيبات تصدير متواضعة إلى أسواق إقليمية للمرة الأولى. غير أن قدرة المعالجة والتعبئة لا تزال محدودة، ولا يزال معظم الصيد يُباع طازجاً بدلاً من مضافة له قيمة.",
        "وتحذّر مجتمعات الصيد من أن المكاسب لا تزال هشة. فلا تزال سفن صيد أجنبية غير قانونية تُرصد قبالة الساحل، تتنافس على المخزون نفسه، ولا يزال القطاع يفتقر إلى بنية تحتية أساسية مثل مواقع إنزال موثوقة وطرق وصول معبّدة في مناطق كثيرة. ودعا قادة محليون إلى استثمار مستمر لترسيخ التقدم الأخير.",
      ],
    },
  },

  // ============ LOCAL NEWS 6 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Diaspora-Funded Water Project Brings Relief to Drought-Hit Rural District",
      excerpt:
        "A community borehole project financed largely by Somali diaspora donations has begun supplying clean water to a rural district that previously relied on costly trucked-in supplies during dry months.",
      body: [
        "A community borehole and water-distribution project financed largely by Somali diaspora donations has begun supplying clean water to a rural district that previously relied on costly, irregular trucked-in water during dry months. Organisers say the project, which took over a year to complete, is among a growing number of diaspora-funded infrastructure initiatives filling gaps that neither local nor federal government budgets have consistently covered.",
        "The fundraising campaign was coordinated largely through social media and community associations abroad, with contributions ranging from small individual donations to larger pledges from diaspora business owners with ties to the district. Organisers say transparent reporting on spending, including photographs and progress updates shared regularly with donors, was essential to sustaining momentum over the many months of fundraising and construction.",
        "Local residents describe the new water access as transformative for daily life, particularly for women and children who previously spent hours each day walking to distant water points, time that can now be redirected toward schooling, farming or income-generating work. District health workers also expect a reduction in waterborne illness linked to previously unsafe water sources.",
        "Organisers say they hope the model can be replicated in neighbouring districts facing similar water scarcity, though they caution that sustained maintenance funding — often the overlooked second half of infrastructure projects — will be essential to ensuring the borehole continues functioning for years rather than falling into disrepair once initial donor attention moves elsewhere.",
      ],
    },
    so: {
      title: "Mashruuca Biyaha ee Qurbaha Lagu Maalgeliyay oo Gargaar u Keenay Degmo Miyi ah oo Abaartu Saameysay",
      excerpt:
        "Mashruuc god-biyeed bulsho iyo qaybinta biyaha oo inta badan lagu maalgeliyay deeqaha Soomaalida qurbaha joogta ayaa bilaabay inuu biyo nadiif ah siiyo degmo miyi ah oo hore ugu tiirsanayd biyo qaali ah oo gaadhi lagu keeno bilaha qallalan.",
      body: [
        "Mashruuc god-biyeed bulsho iyo qaybinta biyaha oo inta badan lagu maalgeliyay deeqaha Soomaalida qurbaha joogta ayaa bilaabay inuu biyo nadiif ah siiyo degmo miyi ah oo hore ugu tiirsanayd biyo qaali ah oo aan joogto ahayn oo gaadhi lagu keeno bilaha qallalan. Abaabulayaashu waxay sheegeen in mashruuca, oo qaatay in ka badan sannad si loo dhammeeyo, uu ka mid yahay tiro sii kordheysa oo hindisayaal kaabayaal ah oo qurbaha lagu maalgeliyay oo buuxinaya farqiyada aan dowladda hoose ama ta federaalku si joogto ah u daboolin.",
        "Ololaha lacag-ururinta ayaa inta badan lagu isku-duwey warbaahinta bulshada iyo ururrada bulshada ee dibadda ku sugan, iyadoo wax-bixinnadu ay kala duwan yihiin deeqo shakhsi oo yaryar ilaa ballanqaadyo waaweyn oo ka yimid ganacsatada qurbaha ee xiriir la leh degmada. Abaabulayaashu waxay sheegeen in warbixin daahfuran oo ku saabsan kharashka, oo ay ku jiraan sawirro iyo cusbooneysiin horumar oo si joogto ah loola wadaago deeqbixiyeyaasha, ay ahayd mid lagama maarmaan u ah sii-wadista dhaqdhaqaaqa bilaha badan ee lacag-ururinta iyo dhismaha.",
        "Dadka deegaanka ku nool waxay sheegayaan in helitaanka biyaha cusub uu beddelay nolosha maalinlaha ah, gaar ahaan haweenka iyo carruurta hore ku qaatay saacado maalin walba oo lugaynaya meelo biyo oo fog, waqti hadda loo wareejin karo dugsiga, beeraha ama shaqo dakhli-keena. Shaqaalaha caafimaadka degmada ayaa sidoo kale filaya hoos-u-dhac ku yimaada cudurrada biyaha ku faafa ee la xidhiidha ilaha biyaha ee aan hore u ammaan ahayn.",
        "Abaabulayaashu waxay sheegeen inay rajaynayaan in qaabkan lagu soo celin karo degmooyinka kale ee ku dhow oo la kulma yaraanta biyaha oo la mid ah, in kastoo ay ka digeen in maalgelinta dayactirka joogtada ah — oo inta badan ah qaybta labaad ee la iska ilaawo ee mashaariicda kaabayaasha — ay lagama maarmaan u tahay in la xaqiijiyo in godka biyuhu uu sii shaqaynayo sanado halkii uu u dilaacayo marka feejignaanta deeqbixiyaha ee hore ay meel kale u guurto.",
      ],
    },
    ar: {
      title: "مشروع مياه ممول من الشتات يجلب الإغاثة لمقاطعة ريفية ضربها الجفاف",
      excerpt:
        "بدأ مشروع بئر مجتمعي مموَّل في معظمه من تبرعات الشتات الصومالي بتزويد مقاطعة ريفية كانت تعتمد سابقاً على إمدادات مياه مكلفة تُنقل بالشاحنات خلال الأشهر الجافة.",
      body: [
        "بدأ مشروع بئر مجتمعي وتوزيع مياه مموَّل في معظمه من تبرعات الشتات الصومالي بتزويد مياه نظيفة لمقاطعة ريفية كانت تعتمد سابقاً على مياه مكلفة وغير منتظمة تُنقل بالشاحنات خلال الأشهر الجافة. ويقول المنظمون إن المشروع، الذي استغرق إتمامه أكثر من عام، من بين عدد متزايد من مبادرات البنية التحتية الممولة من الشتات التي تسد فجوات لم تغطها ميزانيات الحكومة المحلية أو الاتحادية باستمرار.",
        "ونُسّقت حملة جمع التبرعات في معظمها عبر وسائل التواصل الاجتماعي وجمعيات مجتمعية في الخارج، بمساهمات تراوحت بين تبرعات فردية صغيرة وتعهدات أكبر من أصحاب أعمال في الشتات لهم صلات بالمقاطعة. ويقول المنظمون إن التقارير الشفافة عن الإنفاق، بما في ذلك صور وتحديثات تقدم تُشارَك بانتظام مع المتبرعين، كانت ضرورية للحفاظ على الزخم طوال أشهر عديدة من جمع التبرعات والبناء.",
        "ويصف سكان محليون الوصول الجديد إلى المياه بأنه غيّر الحياة اليومية، خصوصاً للنساء والأطفال الذين كانوا يقضون سابقاً ساعات كل يوم يمشون إلى نقاط مياه بعيدة، وهو وقت يمكن الآن توجيهه نحو التعليم أو الزراعة أو عمل مدرّ للدخل. ويتوقع عاملون صحيون في المقاطعة أيضاً انخفاضاً في الأمراض المنقولة بالمياه المرتبطة بمصادر مياه لم تكن آمنة سابقاً.",
        "ويقول المنظمون إنهم يأملون في تكرار النموذج في مقاطعات مجاورة تواجه ندرة مياه مماثلة، رغم تحذيرهم من أن تمويل الصيانة المستدامة — وهو غالباً النصف المهمَل من مشاريع البنية التحتية — سيكون ضرورياً لضمان استمرار عمل البئر لسنوات بدلاً من تعطّله بمجرد انتقال اهتمام المانحين الأوائل إلى مكان آخر.",
      ],
    },
  },

  // ============ LOCAL NEWS 7 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Somali Universities Expand Programs to Meet Growing Demand for Skills",
      excerpt:
        "Higher-education institutions are broadening course offerings in engineering, health, and technology as a young population seeks the training a modernising economy requires.",
      body: [
        "Universities across Somalia are expanding their academic programmes, adding courses in fields such as engineering, health sciences, information technology, and business to meet growing demand from a young and ambitious population. The expansion reflects both a demographic reality — a large share of Somalis are under thirty — and the practical needs of a rebuilding economy.",
        "For decades, higher education in Somalia was severely disrupted, and many who could afford it sought degrees abroad. In recent years, a resurgence of local institutions has begun to offer alternatives closer to home, though quality, accreditation, and resources vary widely across the sector.",
        "Students and educators describe both opportunity and constraint. Demand for places far outstrips capacity at many institutions, and graduates entering the job market face an economy that cannot yet absorb all their ambitions. Aligning what universities teach with what employers need remains an ongoing challenge.",
        "Still, the growth signals something important: an investment in human capital by families and institutions betting on the country's future. Educators argue that a skilled, locally-trained workforce is essential to development — that the engineers, health workers, and technologists trained today will shape what Somalia can build tomorrow.",
      ],
    },
    so: {
      title: "Jaamacadaha Soomaaliyeed oo Balaadhiya Barnaamijyada si ay ula Kulmaan Baahida sii Kordheysa ee Xirfadaha",
      excerpt:
        "Hay'adaha tacliinta sare ayaa ballaadhinaya bixinta koorsooyinka injineernimada, caafimaadka, iyo teknoolajiyada iyadoo dad dhalinyaro ah ay raadinayaan tababarka uu dhaqaale casriyeynaya u baahan yahay.",
      body: [
        "Jaamacadaha ku baahsan Soomaaliya ayaa ballaadhinaya barnaamijyadooda tacliimeed, iyagoo ku darsanaya koorsooyin ku saabsan qaybo ay ka mid yihiin injineernimada, sayniska caafimaadka, teknoolajiyada macluumaadka, iyo ganacsiga si ay ula kulmaan baahi sii kordheysa oo ka timaadda dad dhalinyaro ah oo hammi leh. Ballaadhintu waxay ka tarjumaysaa xaqiiqo tirokoob — qayb weyn oo Soomaalida ah ayaa ka yar soddon — iyo baahiyaha wax-ku-ool ah ee dhaqaale dib-u-dhisaya.",
        "Muddo tobannaan sano ah, tacliinta sare ee Soomaaliya waxaa si daran loo carqaladeeyay, dad badan oo awoodi karayna waxay shahaadooyin ka raadsadeen dibadda. Sannadihii la soo dhaafay, soo-noqoshada hay'adaha maxalliga ah ayaa bilaabay inay bixiyaan xulashooyin guriga u dhow, inkastoo tayada, aqoonsiga, iyo kheyraadku ay si weyn ugu kala duwan yihiin qaybta.",
        "Ardayda iyo macallimiintu waxay tilmaamaan fursad iyo xaddidaad labadaba. Baahida kuraasta ayaa si weyn uga sarreysa awoodda hay'ado badan, qalin-jabiyeyaasha soo gala suuqa shaqadana waxay wajahaan dhaqaale aan weli qaadi karin dhammaan hammigooda. Waafajinta waxa jaamacaduhu baraan iyo waxa shaqo-bixiyeyaashu u baahan yihiin ayaa weli ah caqabad socota.",
        "Weli, koritaanku wuxuu tilmaamayaa wax muhiim ah: maalgelin lagu sameeyay raasumaalka aadanaha oo ay qoysaska iyo hay'aduhu ku sharadeen mustaqbalka dalka. Macallimiintu waxay ku doodaan in shaqaale xirfad leh oo maxalli ah loo tababaray uu lagama maarmaan u yahay horumarka — in injineerada, shaqaalaha caafimaadka, iyo teknoolajiyeyaasha maanta la tababaray ay qaabeyn doonaan waxa Soomaaliya berri dhisi karto.",
      ],
    },
    ar: {
      title: "الجامعات الصومالية توسّع برامجها لتلبية الطلب المتنامي على المهارات",
      excerpt:
        "توسّع مؤسسات التعليم العالي عروضها الدراسية في الهندسة والصحة والتكنولوجيا مع سعي سكان شباب إلى التدريب الذي يتطلبه اقتصاد يتحدّث.",
      body: [
        "توسّع الجامعات في أنحاء الصومال برامجها الأكاديمية، مضيفةً مقررات في مجالات مثل الهندسة والعلوم الصحية وتكنولوجيا المعلومات والأعمال لتلبية الطلب المتنامي من سكان شباب وطموحين. ويعكس هذا التوسع واقعاً ديموغرافياً — إذ إن حصة كبيرة من الصوماليين دون الثلاثين — والاحتياجات العملية لاقتصاد يعيد البناء.",
        "لعقود، تعطّل التعليم العالي في الصومال بشدة، وسعى كثير ممن يستطيعون تحمّل تكلفته إلى شهادات في الخارج. وفي السنوات الأخيرة، بدأت عودة المؤسسات المحلية بتقديم بدائل أقرب إلى الوطن، وإن كانت الجودة والاعتماد والموارد تتفاوت على نطاق واسع عبر القطاع.",
        "يصف الطلاب والمعلمون فرصةً وقيداً معاً. فالطلب على المقاعد يفوق كثيراً القدرة الاستيعابية في مؤسسات كثيرة، والخريجون الداخلون إلى سوق العمل يواجهون اقتصاداً لا يستطيع بعدُ استيعاب كل طموحاتهم. وتبقى مواءمة ما تُدرّسه الجامعات مع ما يحتاجه أصحاب العمل تحدياً مستمراً.",
        "ومع ذلك، يشير النمو إلى شيء مهم: استثمار في رأس المال البشري من قبل أسر ومؤسسات تراهن على مستقبل البلاد. ويرى المعلمون أن قوة عاملة ماهرة مدرَّبة محلياً ضرورية للتنمية — وأن المهندسين والعاملين الصحيين والتقنيين الذين يُدرَّبون اليوم سيشكّلون ما يستطيع الصومال بناءه غداً.",
      ],
    },
  },

  // ============ LOCAL NEWS 8 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Youth Football League Draws Record Crowds in Sign of Normalising City Life",
      excerpt:
        "A community football league that expanded to include teams from a dozen Mogadishu neighbourhoods is drawing its largest crowds yet, offering young residents an outlet increasingly seen as a marker of everyday normalcy.",
      body: [
        "A community youth football league that expanded this season to include teams from a dozen Mogadishu neighbourhoods is drawing its largest crowds yet, according to organisers, who describe the growing turnout as a small but telling marker of everyday life gradually normalising in parts of the city. Weekend matches now regularly draw hundreds of spectators to pitches that a decade ago saw little organised activity.",
        "Coaches involved in the league say demand from young players has consistently outstripped the number of available teams and qualified coaches, forcing organisers to turn away hopeful participants each season. Several teams have begun fundraising among local businesses and diaspora supporters to expand training facilities and equipment.",
        "Beyond sport itself, organisers and parents describe the league as offering structure and a sense of belonging for young people growing up in neighbourhoods still recovering from years of instability. Several coaches noted that consistent participation has coincided, anecdotally, with improved school attendance among younger players, though no formal study has measured the effect.",
        "League organisers say they hope to formalise a citywide tournament structure next season and are in early talks with a regional football federation about potential support, viewing the grassroots league as a pipeline that could eventually feed more competitive youth academies.",
      ],
    },
    so: {
      title: "Horyaalka Kubadda Cagta ee Dhalinyarada oo Soo Jiitay Dad Badan oo Diiwaan ah, Calaamad u ah Caadi-noqoshada Nolosha Magaalada",
      excerpt:
        "Horyaal kubadda cagta ee dhalinyarada bulshada oo xilligan ku balaadhamay kooxo ka socda laba iyo toban xaafadood oo Muqdisho ah ayaa soo jiitay dadka ugu badan ilaa hadda, isagoo bixinaya meel dadka degan ay ku daydaan si sii kordheysa loo arko calaamad u ah caadi-noqoshada nolosha maalinlaha ah.",
      body: [
        "Horyaal kubadda cagta ee dhalinyarada bulshada oo xilligan ku balaadhamay kooxo ka socda laba iyo toban xaafadood oo Muqdisho ah ayaa soo jiitay dadka ugu badan ilaa hadda, sida ay sheegeen abaabulayaasha, kuwaas oo ku tilmaamay dadka soo kordhaya calaamad yar laakiin muhiim ah oo ah nolosha maalinlaha ah oo si tartiib ah caadi ugu noqonaysa qaybo ka mid ah magaalada. Ciyaaraha dhamaadka toddobaadka ayaa hadda si joogto ah u soo jiitaa boqollaal daawade oo ku yimaada garoomo tobankii sano ee la soo dhaafay aan lahayn dhaqdhaqaaq nidaamsan.",
        "Tababarayaasha ka qaybqaata horyaalka waxay sheegeen in baahida ciyaartoyda dhalinyarada ahi ay si joogto ah uga sarreyso tirada kooxaha diyaarka ah iyo tababarayaasha qalanka ah, taasoo abaabulayaasha ku qasabtay inay ka gaabsadaan ka-qaybgale rajo qabay xilli kasta. Dhowr kooxood ayaa bilaabay lacag-ururin ay la sameeyaan ganacsatada maxalliga ah iyo taageerayaasha qurbaha si ay u balaadhiyaan kaabayaasha tababarka iyo qalabka.",
        "Ka baxsan ciyaarta lafteeda, abaabulayaasha iyo waalidiintu waxay ku tilmaamaan horyaalka mid siinaya qaab-dhismeed iyo dareen ka mid ahaanshaha oo loogu talagalay dhalinyarada ku koraya xaafado weli ka soo kabanaya sannado xasillooni-darro ah. Dhowr tababare ayaa xusay in ka-qaybgalka joogtada ahi uu la socday, sheeko ahaan, dugsi-tagid hagaagay ciyaartoyda yaryar, in kastoo aan wax daraasad rasmi ah la sameyn oo qiyaasay saameynta.",
        "Abaabulayaasha horyaalku waxay sheegeen inay rajaynayaan inay rasmi ka dhigaan qaab-dhismeed tartan magaalo-oo-dhan ah xilliga soo socda, waxayna ku jiraan wadahadal hore la yeeshay ururka kubadda cagta ee gobolka oo ku saabsan taageero suurtogal ah, iyagoo horyaalka aasaasiga ah u arka biyo-mareen laga yaabo inuu ugu dambeyntii quudiyo akadeemiyada dhalinyarada ee tartanka badan.",
      ],
    },
    ar: {
      title: "دوري كرة قدم للشباب يجذب حشوداً قياسية كعلامة على عودة الحياة الطبيعية في المدينة",
      excerpt:
        "يجذب دوري كرة قدم مجتمعي توسّع هذا الموسم ليضم فرقاً من اثني عشر حياً في مقديشو أكبر حشوده حتى الآن، مقدماً منفذاً للسكان الشباب يُنظر إليه بشكل متزايد كعلامة على الحياة اليومية الطبيعية.",
      body: [
        "يجذب دوري كرة قدم مجتمعي للشباب توسّع هذا الموسم ليضم فرقاً من اثني عشر حياً في مقديشو أكبر حشوده حتى الآن، بحسب المنظمين، الذين يصفون الإقبال المتزايد بأنه علامة صغيرة لكنها دالة على عودة الحياة اليومية تدريجياً إلى طبيعتها في أجزاء من المدينة. وتجذب مباريات نهاية الأسبوع الآن بانتظام مئات المتفرجين إلى ملاعب لم تشهد قبل عقد نشاطاً منظماً يُذكر.",
        "ويقول مدربون مشاركون في الدوري إن الطلب من اللاعبين الشباب تجاوز باستمرار عدد الفرق المتاحة والمدربين المؤهلين، ما اضطر المنظمين إلى رفض مشاركين طموحين كل موسم. وبدأت عدة فرق جمع تبرعات من شركات محلية وداعمين من الشتات لتوسيع مرافق التدريب والمعدات.",
        "وما وراء الرياضة نفسها، يصف المنظمون والآباء الدوري بأنه يوفر بنية وشعوراً بالانتماء لشباب ينشؤون في أحياء لا تزال تتعافى من سنوات عدم الاستقرار. ولاحظ عدة مدربين أن المشاركة المستمرة تزامنت، بشكل غير رسمي، مع تحسّن الحضور المدرسي بين اللاعبين الأصغر سناً، رغم عدم وجود دراسة رسمية قاست الأثر.",
        "ويقول منظمو الدوري إنهم يأملون في إضفاء الطابع الرسمي على بنية بطولة على مستوى المدينة الموسم المقبل، وهم في محادثات مبكرة مع اتحاد كرة قدم إقليمي بشأن دعم محتمل، إذ ينظرون إلى الدوري الشعبي كقناة قد تغذي في النهاية أكاديميات شباب أكثر تنافسية.",
      ],
    },
  },

  // ============ LOCAL NEWS 9 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Market Fire in Baidoa Destroys Dozens of Stalls, Renewing Calls for Fire Safety Rules",
      excerpt:
        "A fast-moving fire tore through a crowded section of Baidoa's central market overnight, destroying dozens of stalls and prompting renewed calls for basic fire-safety regulation in the city's commercial districts.",
      body: [
        "A fast-moving fire tore through a crowded section of Baidoa's central market overnight, destroying dozens of stalls selling textiles, household goods and food staples before local volunteers and a small municipal fire crew managed to contain it. No deaths were reported, though several traders suffered injuries while attempting to salvage merchandise, and officials say the full extent of losses is still being assessed.",
        "Traders whose stalls were destroyed described losing years of accumulated stock and savings in a matter of hours, with several noting they carried no insurance — a near-universal reality in a market where formal insurance products remain largely unavailable to small vendors. Community members organised an informal collection to provide immediate relief to the worst-affected families.",
        "Market fires are a recurring hazard in many Somali cities, where dense stalls built from flammable materials, informal electrical wiring, and limited firefighting capacity combine to create serious risk. Municipal officials in Baidoa acknowledged the city's fire response capacity remains under-resourced relative to the market's size and density.",
        "Traders' associations have renewed longstanding calls for basic fire-safety standards, including wider walkways between stalls and designated equipment storage points, while acknowledging that enforcement would require investment municipal budgets have so far been unable to provide. City officials say a review of market safety standards is now under consideration.",
      ],
    },
    so: {
      title: "Dab ka Qabsaday Suuqa Baydhabo oo Baabbi'iyay Tobannaan Alaab-qabad, Taasoo Dib u Kicisay Baaqyo ku Saabsan Xeerarka Amniga Dabka",
      excerpt:
        "Dab si degdeg ah u fidi jiray oo ka dhacay qayb dad badan ku urursan oo ka mid ah suuqa dhexe ee Baydhabo habeenkii dhexe ayaa baabbi'iyay tobannaan alaab-qabad, taasoo dib u kicisay baaqyo ku saabsan xeerar aasaasi oo amniga dabka ah oo lagu dabaqo xaafadaha ganacsiga magaalada.",
      body: [
        "Dab si degdeg ah u fidi jiray oo ka dhacay qayb dad badan ku urursan oo ka mid ah suuqa dhexe ee Baydhabo habeenkii dhexe ayaa baabbi'iyay tobannaan alaab-qabad oo iibinaya dharka, alaabta guriga iyo cuntooyinka aasaasiga ah ka hor inta ay mutadawiciinta maxalliga ah iyo koox yar oo dab-damin oo degmadu leedahay ay ka joojiyeen. Dhimasho lama soo warramin, in kastoo dhowr ganacsato ay dhaawacyo ku dhaceen isku daygooda inay badbaadiyaan alaabtooda, saraakiishuna waxay sheegeen in cabbirka dhabta ah ee khasaaraha wali la qiimeynayo.",
        "Ganacsatada alaab-qabadyadoodu baabbi'ay waxay sheegeen inay lumiyeen sanado alaab la ururiyay iyo keydad lacageed saacado gudahood, iyadoo dhowr ay xusaan inaysan lahayn caymis — xaqiiqo ku dhow guud ahaan suuq ay caymiska rasmiga ahi weli ka maqan yahay iibiyeyaasha yaryar. Xubnaha bulshadu waxay abaabuleen ururin aan rasmi ahayn si loo bixiyo gargaar degdeg ah oo loogu talagalo qoysaska ugu daran saameeya.",
        "Dabab suuq oo soo noqnoqda waa khatar joogto ah oo ku dhaca magaalooyin badan oo Soomaaliyeed, halkaas oo alaab-qabadyo qatar ah oo ka samaysan alaabo dab-qabsi badan, waayarro koronto oo aan rasmi ahayn, iyo awood dab-damin oo xaddidan ay isku dhafaan si ay u abuuraan khatar daran. Saraakiisha degmada Baydhabo ayaa qirtay in awoodda dab-damineed ee magaalada ay wali tahay mid maalgelin-yari haysta marka la barbar dhigo baaxadda iyo cufnaanta suuqa.",
        "Ururrada ganacsatadu waxay dib u kiciyeen baaqyo hore ka jiray oo ku saabsan heerar aasaasi oo amniga dabka ah, oo ay ku jiraan waddooyin ballaadhan oo u dhexeeya alaab-qabadyada iyo goobo gaar ah oo lagu kaydiyo qalabka, iyagoo qirtay in fulintu ay u baahan tahay maalgelin ay ilaa hadda miisaaniyadaha degmooyinku aysan awoodin inay bixiyaan. Saraakiisha magaaladu waxay sheegeen in dib-u-eegis heerarka amniga suuqa hadda la fiirinayo.",
      ],
    },
    ar: {
      title: "حريق في سوق بيدوا يدمّر عشرات الأكشاك، ويجدد الدعوات لقواعد السلامة من الحرائق",
      excerpt:
        "اجتاح حريق سريع الانتشار جزءاً مكتظاً من سوق بيدوا المركزي ليلاً، مدمّراً عشرات الأكشاك ومجدداً الدعوات لتنظيم أساسي للسلامة من الحرائق في الأحياء التجارية بالمدينة.",
      body: [
        "اجتاح حريق سريع الانتشار جزءاً مكتظاً من سوق بيدوا المركزي ليلاً، مدمّراً عشرات الأكشاك التي تبيع المنسوجات والسلع المنزلية والمواد الغذائية الأساسية قبل أن يتمكن متطوعون محليون وطاقم إطفاء بلدي صغير من احتوائه. ولم تُسجّل وفيات، رغم إصابة عدة تجار أثناء محاولتهم إنقاذ بضائعهم، ويقول مسؤولون إن الحجم الكامل للخسائر لا يزال قيد التقييم.",
        "ووصف تجار دُمّرت أكشاكهم فقدان سنوات من المخزون المتراكم والمدخرات في غضون ساعات، مع إشارة عدد منهم إلى عدم حملهم أي تأمين — وهو واقع شبه شامل في سوق لا تزال منتجات التأمين الرسمية فيه غير متاحة إلى حد كبير لصغار الباعة. ونظّم أفراد المجتمع تبرعاً غير رسمي لتقديم إغاثة فورية لأشد الأسر تضرراً.",
        "وتُعد حرائق الأسواق خطراً متكرراً في مدن صومالية كثيرة، حيث تجتمع أكشاك مكتظة مبنية من مواد قابلة للاشتعال وأسلاك كهربائية غير رسمية وقدرة إطفاء محدودة لتشكّل خطراً جدياً. وأقرّ مسؤولون بلديون في بيدوا بأن قدرة استجابة المدينة للحرائق لا تزال ناقصة الموارد مقارنة بحجم السوق وكثافته.",
        "وجدّدت جمعيات التجار دعوات قديمة لمعايير أساسية للسلامة من الحرائق، بما في ذلك ممرات أوسع بين الأكشاك ونقاط مخصصة لتخزين المعدات، مع إقرارها بأن التنفيذ سيتطلب استثماراً عجزت ميزانيات البلدية حتى الآن عن توفيره. ويقول مسؤولو المدينة إن مراجعة معايير سلامة السوق قيد النظر الآن.",
      ],
    },
  },

  // ============ LOCAL NEWS 10 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Camel Milk Cooperative Expands Sales as Urban Demand for Traditional Products Grows",
      excerpt:
        "A pastoralist-run camel milk cooperative has expanded its urban distribution network, capitalising on renewed city demand for a traditional staple as households seek affordable, locally-produced nutrition.",
      body: [
        "A pastoralist-run camel milk cooperative has expanded its distribution network into several new Mogadishu neighbourhoods this year, capitalising on renewed urban demand for a traditional dietary staple as households increasingly seek affordable, locally produced nutrition amid rising prices for imported goods. Cooperative leaders say sales have grown steadily as more urban consumers rediscover a product long associated primarily with rural and pastoralist life.",
        "Camel milk has deep roots in Somali culinary and pastoralist tradition, prized for its nutritional density and longer shelf stability compared with cow's milk in a hot climate without universal refrigeration. Cooperative members say growing urban interest has provided a valuable new income stream for pastoralist families whose livelihoods remain vulnerable to recurring drought.",
        "Scaling the business has required investment in basic cold-chain logistics to maintain freshness during transport from herding areas to city markets, along with simple packaging upgrades that cooperative leaders say have helped the product compete more credibly with imported dairy alternatives on supermarket shelves.",
        "Members say the model offers a template for other pastoralist products — ghee and traditional cheeses among them — to find new urban markets, provided similar investment in logistics and modest branding can be mobilised. They caution, however, that herd losses during drought years remain the single biggest threat to sustaining supply.",
      ],
    },
    so: {
      title: "Iskaashatada Caanaha Geela oo Balaadhinaysa Iibka iyadoo Baahida Magaalada ee Alaabta Dhaqameed ay Kordheyso",
      excerpt:
        "Iskaashato ay maamusho reer-guuraa oo caano geel ah ayaa balaadhisay shabakadeeda qaybinta magaalada, iyadoo faa'iidaysanaysa baahida magaalada ee cusub ee alaab dhaqameed ah iyadoo qoysasku ay raadinayaan nafaqo jaban oo maxalli ah.",
      body: [
        "Iskaashato ay maamusho reer-guuraa oo caano geel ah ayaa sanadkan ku balaadhisay shabakadeeda qaybinta dhowr xaafadood oo cusub oo Muqdisho ah, iyadoo faa'iidaysanaysa baahida magaalada ee cusub ee alaab cunno dhaqameed ah iyadoo qoysasku ay si sii kordheysa u raadinayaan nafaqo jaban oo maxalli ah lagu soo saaray xilli qiimayaasha alaabta la soo dejiyo ay sare u kacayaan. Hoggaamiyeyaasha iskaashaddu waxay sheegeen in iibku uu si joogto ah u kordhay maadaama macaamiisha magaalada badan oo dib u ogaanaya alaab taariikh ahaan lala xidhiidhin jiray inta badan nolosha miyiga iyo reer-guuraaga.",
        "Caanaha geelu waxay leeyihiin xidid qoto dheer oo ku dhex jira cuntada iyo dhaqanka reer-guuraaga Soomaaliyeed, iyagoo lagu ammaano cufnaantooda nafaqada iyo joogitaankooda dheer marka la barbar dhigo caanaha saca cimilo kulul oo aan qabow guud lahayn. Xubnaha iskaashaddu waxay sheegeen in xiisaha magaalada ee kordhayaa uu siiyay wareeg dakhli oo cusub oo qiimo leh qoysaska reer-guuraaga ee nafaqadoodu ay weli u nugul tahay abaaraha soo noqnoqda.",
        "Balaadhinta ganacsigu waxay u baahnayd maalgelin lagu daro saada silsiladda qabow ee aasaasiga ah si loo hayo cusayntooda inta lagu jiro gaadiidka ka soo socda meelaha xoolaha loo raaco ilaa suuqyada magaalada, oo ay weheliso hagaajin baakadeed oo fudud oo hoggaamiyeyaasha iskaashaddu ay sheegeen inay ka caawiyeen alaabta inay si aamin ah ula tartanto beddelka albaabka ee la soo dejiyo taagyada suuq-weynaha.",
        "Xubnuhu waxay sheegayaan in moodalku uu bixiyo qaab-tijaabo alaabo kale oo reer-guuraa ah — subagga iyo farmaajada dhaqameed oo ka mid ah — ay ku helaan suuqyo magaalo oo cusub, haddii maalgelin la mid ah oo saadka iyo sumaddaynta fudud la soo urursado. Waxay ka digayaan, si kastaba, in luminta xoolaha xilliyada abaaraha ay weli tahay khatarta ugu weyn ee hal-abuurka ee la kulma sii-wadista bixinta.",
      ],
    },
    ar: {
      title: "تعاونية حليب الإبل توسّع مبيعاتها مع تنامي الطلب الحضري على المنتجات التقليدية",
      excerpt:
        "وسّعت تعاونية لحليب الإبل يديرها رعاة شبكة توزيعها الحضرية، مستفيدة من طلب متجدد في المدينة على سلعة غذائية تقليدية مع سعي الأسر إلى تغذية ميسورة ومنتجة محلياً.",
      body: [
        "وسّعت تعاونية لحليب الإبل يديرها رعاة شبكة توزيعها إلى عدة أحياء جديدة في مقديشو هذا العام، مستفيدة من طلب حضري متجدد على سلعة غذائية تقليدية مع سعي الأسر بشكل متزايد إلى تغذية ميسورة التكلفة ومنتجة محلياً وسط ارتفاع أسعار السلع المستوردة. ويقول قادة التعاونية إن المبيعات نمت باطراد مع إعادة اكتشاف مزيد من المستهلكين الحضريين لمنتج ارتبط تاريخياً بحياة الريف والرعي بشكل رئيسي.",
        "ويملك حليب الإبل جذوراً عميقة في الطهي وتقاليد الرعي الصومالية، ويحظى بتقدير لكثافته الغذائية واستقراره الأطول على الرفوف مقارنة بحليب البقر في مناخ حار دون تبريد شامل. ويقول أعضاء التعاونية إن الاهتمام الحضري المتنامي وفّر مصدر دخل جديداً قيّماً لأسر رعوية لا تزال سبل عيشها عرضة للجفاف المتكرر.",
        "وتطلّب توسيع النشاط التجاري استثماراً في لوجستيات سلسلة تبريد أساسية للحفاظ على النضارة أثناء النقل من مناطق الرعي إلى أسواق المدينة، إلى جانب تحسينات تعبئة بسيطة يقول قادة التعاونية إنها ساعدت المنتج على منافسة بدائل الألبان المستوردة بمصداقية أكبر على أرفف السوبرماركت.",
        "ويقول الأعضاء إن النموذج يوفر مخططاً لمنتجات رعوية أخرى — من بينها السمن والأجبان التقليدية — لإيجاد أسواق حضرية جديدة، شريطة حشد استثمار مماثل في اللوجستيات وعلامة تجارية متواضعة. لكنهم يحذّرون من أن خسائر القطعان خلال سنوات الجفاف تبقى التهديد الأكبر لاستدامة الإمداد.",
      ],
    },
  },

  // ============ LOCAL NEWS 11 ============
  {
    categoryKey: "local-news",
    en: {
      title: "New Coastal Road Cuts Travel Time Between Kismayo and Neighbouring Districts",
      excerpt:
        "Completion of a long-delayed coastal road linking Kismayo to surrounding farming districts is cutting travel times sharply, easing the movement of produce, patients and passengers alike.",
      body: [
        "The completion of a long-delayed coastal road linking Kismayo to surrounding farming districts has cut travel times sharply, easing the movement of agricultural produce, patients seeking hospital care, and ordinary passengers who previously depended on a rutted track that became impassable during rains. Officials say the project took several years longer than originally planned amid funding gaps and security-related construction delays.",
        "Farmers along the route say the improved road has already changed their calculations about what to grow, since produce that previously spoiled during slow, bumpy transport to market can now reach Kismayo's traders within hours rather than a full day. Several described plans to expand cultivation of more perishable crops now that reliable transport removes a major constraint.",
        "Transport operators report a similar shift, with shared vehicle fares along the route falling as travel times shortened and vehicle wear and tear declined. Local clinics have also noted more timely patient referrals to Kismayo's better-equipped hospital, a change health workers say could meaningfully affect outcomes for emergency and maternal cases in particular.",
        "Regional officials say the road is part of a broader, still partially funded plan to connect a network of farming districts to the port city, and have appealed to international partners for continued support to complete remaining sections that link more remote communities further inland.",
      ],
    },
    so: {
      title: "Waddo Cusub oo Xeebeed oo Yareysay Wakhtiga Safarka ee u Dhexeeya Kismaayo iyo Degmooyinka Deriska ah",
      excerpt:
        "Dhammaystirka waddo xeebeed oo dib loo dhigay muddo dheer oo xidha Kismaayo iyo degmooyinka beeraha ee ku hareeraysan ayaa si aad ah u yareysay wakhtiga safarka, fududeynaysa dhaqdhaqaaqa dalagga, bukaannada iyo rakaabka.",
      body: [
        "Dhammaystirka waddo xeebeed oo dib loo dhigay muddo dheer oo xidha Kismaayo iyo degmooyinka beeraha ee ku hareeraysan ayaa si aad ah u yareeyay wakhtiga safarka, fududeynaysa dhaqdhaqaaqa dalagga beeraha, bukaannada raadinaya daryeel isbitaal, iyo rakaabka caadiga ah ee hore ku tiirsanaa waddo qafis ah oo aan la mari karin xilliga roobabka. Saraakiishu waxay sheegeen in mashruucu qaatay sanado ka badan kuwii markii hore loo qorsheeyay, iyadoo jirey farqiyo maalgelin iyo dib-u-dhac dhismeed oo la xidhiidha amniga.",
        "Beeraleyda ku teedsan jidka ayaa sheegay in waddada hagaagsan hore u beddeshay xisaabaadkooda ku saabsan waxa la beero, maadaama dalagga hore u kharibi jiray gaadiid gaabis oo qallalan oo loo maro suuqa uu hadda gaadhi karo ganacsatada Kismaayo saacado gudahood halkii uu ahaan lahaa maalin oo dhan. Dhowr ayaa sharraxay qorshayaal lagu ballaadhinayo beerashada dalag si dhaqso ah u kharibi kara hadda oo gaadiid la isku halayn karo uu ka saaray caqabad weyn.",
        "Maamulayaasha gaadiidku waxay ka warramaan isbeddel la mid ah, iyadoo kirada gaadiidka la wadaago ee jidka ay hoos u dhacday marka wakhtiyada safarka gaaboobeen oo xumaanshaha gawaarida uu hoos u dhacay. Xarumaha caafimaadka maxalliga ah ayaa sidoo kale xusay gudbin bukaan oo waqti ku habboon oo loo geeyo isbitaalka Kismaayo ee qalabka wanaagsan leh, isbeddel shaqaalaha caafimaaduhu sheegeen inuu si macno leh u saameyn karo natiijooyinka kiisaska degdegga ah iyo kuwa hooyada gaar ahaan.",
        "Saraakiisha gobolku waxay sheegeen in waddadu ay qayb ka tahay qorshe ballaadhan, oo weli qayb ahaan la maalgeliyay, oo lagu xidhayo shabakad degmooyin beereed ah magaalada dekedda, waxayna ka baryeen shurakada caalamiga ah taageero sii socota si loo dhammeeyo qaybaha hadhay ee ku xidhaya bulshooyin fog oo sii xigo gudaha.",
      ],
    },
    ar: {
      title: "طريق ساحلي جديد يقلّص زمن السفر بين كيسمايو والمقاطعات المجاورة",
      excerpt:
        "أدى اكتمال طريق ساحلي تأخر طويلاً ويربط كيسمايو بمقاطعات زراعية محيطة إلى تقليص زمن السفر بشكل حاد، ما يسهّل حركة المحاصيل والمرضى والركاب على حد سواء.",
      body: [
        "أدى اكتمال طريق ساحلي تأخر طويلاً ويربط كيسمايو بمقاطعات زراعية محيطة إلى تقليص زمن السفر بشكل حاد، ما يسهّل حركة المحاصيل الزراعية والمرضى الساعين إلى رعاية في المستشفيات والركاب العاديين الذين كانوا يعتمدون سابقاً على مسار وعر يصبح غير قابل للعبور خلال الأمطار. ويقول مسؤولون إن المشروع استغرق سنوات أطول مما خُطط له أصلاً وسط فجوات تمويل وتأخيرات بناء متعلقة بالأمن.",
        "ويقول مزارعون على طول الطريق إن تحسّنه غيّر بالفعل حساباتهم بشأن ما يزرعونه، إذ إن محاصيل كانت تتلف سابقاً أثناء نقل بطيء ووعر إلى السوق يمكنها الآن الوصول إلى تجار كيسمايو في غضون ساعات بدلاً من يوم كامل. ووصف عدد منهم خططاً لتوسيع زراعة محاصيل أكثر قابلية للتلف الآن بعد أن أزال النقل الموثوق قيداً رئيسياً.",
        "ويفيد مشغّلو النقل بتحول مماثل، مع انخفاض أجرة المركبات المشتركة على طول الطريق مع تقلّص أوقات السفر وتراجع تآكل المركبات. ولاحظت عيادات محلية أيضاً إحالات مرضى أكثر توقيتاً إلى مستشفى كيسمايو الأفضل تجهيزاً، وهو تغيير يقول عاملون صحيون إنه قد يؤثر بشكل ملموس على النتائج، خصوصاً في حالات الطوارئ وحالات الأمومة.",
        "ويقول مسؤولون إقليميون إن الطريق جزء من خطة أوسع، لا تزال ممولة جزئياً، لربط شبكة من المقاطعات الزراعية بمدينة الميناء، وناشدوا شركاء دوليين بدعم مستمر لإتمام الأقسام المتبقية التي تربط مجتمعات أبعد داخل البر.",
      ],
    },
  },

  // ============ LOCAL NEWS 12 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Ramadan Charity Drives Provide Lifeline for Families Hit Hardest by Rising Prices",
      excerpt:
        "Community-organised charity kitchens and food distributions expanded significantly this Ramadan, as organisers report a sharp rise in the number of families seeking assistance amid rising living costs.",
      body: [
        "Community-organised charity kitchens and food distributions expanded significantly across several Somali cities this Ramadan, with organisers reporting a sharp rise in the number of families seeking assistance amid rising living costs and, in drought-affected regions, acute food insecurity. Mosque committees and neighbourhood associations that typically distribute modest quantities of food said demand this year outpaced anything they had organised in recent memory.",
        "Volunteers describe long queues forming well before iftar in several neighbourhoods, with organisers stretching limited donations across a growing number of households. Many said they had been forced to reduce individual portion sizes to serve more families, even as overall donations from local businesses and diaspora contributors also increased compared with previous years.",
        "Diaspora giving has played an outsized role in sustaining these efforts, with several charity drives coordinated largely through social media appeals that allowed relatives abroad to contribute directly to specific neighbourhood kitchens rather than through large aid organisations. Organisers say this direct model has built trust, with donors able to see photographs and updates showing exactly how funds were used.",
        "Aid coordinators caution that Ramadan-driven generosity, while significant, is not a substitute for sustained humanitarian response to the underlying drought and economic pressures driving need. They have urged continued attention and funding well beyond the holy month, when public and donor focus on hunger in Somalia has historically tended to fade.",
      ],
    },
    so: {
      title: "Ololayaasha Sadaqada Ramadaan oo Gurmad u Ah Qoysaska ay Ugu Daran Saamaysay Qiimaha Kordhaya",
      excerpt:
        "Jikooyinka sadaqada iyo qaybinta cuntada ee bulshadu abaabusho ayaa si weyn u ballaadhay Ramadaankan, iyadoo abaabulayaashu ay ka warramayaan koror aad u weyn oo ku yimid tirada qoysaska raadinaya gargaar xilli nolol-maalmeedku qaali noqday.",
      body: [
        "Jikooyinka sadaqada iyo qaybinta cuntada ee bulshadu abaabusho ayaa si weyn ugu ballaadhay dhowr magaalo oo Soomaaliyeed Ramadaankan, iyadoo abaabulayaashu ay ka warramayaan koror aad u weyn oo ku yimid tirada qoysaska raadinaya gargaar xilli nolol-maalmeedku qaali noqday iyo, gobollada abaartu saamaysay, sii-daynta cuntada oo daran. Guddiyada masaajidyada iyo ururrada xaafadaha ee caadiyan qaybiya cunto qaddar yar waxay sheegeen in baahida sanadkan ay dhaaftay wax kasta oo ay abaabuleen dhawaan la xasuusto.",
        "Mutadawiciintu waxay sheegayaan safaf dhaadheer oo isku dhisma inta aan iftaarku bilaabmin xaafado badan, iyadoo abaabulayaashu ay kala qeybinayaan deeqo xaddidan qoysas sii kordhaya. Qaar badan ayaa sheegay inay ku qasbeen inay yareeyaan qaddarka qaybta shakhsi si ay ugu adeegaan qoysas badan, xitaa iyadoo deeqaha guud ee ka yimid ganacsatada maxalliga ah iyo wax-bixiyeyaasha qurbaha ay sidoo kale kordheen marka la barbar dhigo sannadihii hore.",
        "Deeqaha qurbaha ayaa ciyaartay door aan caadi ahayn oo lagu sii wado dadaalladan, iyadoo dhowr ololayaal sadaqadeed lagu isku-duwey inta badan baaqyo warbaahinta bulshada oo u oggolaaday qaraabada dibadda ku sugan inay si toos ah ugu deeqaan jikooyin xaafad gaar ah halkii ay ka mari lahaayeen hay'ado gargaar oo waaweyn. Abaabulayaashu waxay sheegeen in moodalkan toosan uu dhisay kalsooni, iyadoo deeqbixiyeyaashu ay arki karaan sawirro iyo cusbooneysiin muujinaya sida saxda ah ee lacagta loo isticmaalay.",
        "Isku-duwayaasha gargaarku waxay ka digayaan in deeqsinimada uu keeno Ramadaanku, in kastoo muhiim ahayn, aysan beddelin jawaab bini'aadantinimo oo joogto ah oo loogu talagalo abaarta hoosta taal iyo cadaadiska dhaqaale ee kiciya baahida. Waxay ku dhiirrigeliyeen feejignaan iyo maalgelin sii socota oo aad uga sii dheer bisha barakaysan, xilli dareenka dadweynaha iyo deeqbixiyeyaashu ee gaajada Soomaaliya taariikh ahaan u dhaqan jireen inay dib u dhalaaleen.",
      ],
    },
    ar: {
      title: "حملات صدقة رمضانية تشكّل شريان حياة للأسر الأشد تضرراً من ارتفاع الأسعار",
      excerpt:
        "توسّعت مطابخ خيرية وتوزيعات غذاء ينظمها المجتمع بشكل كبير هذا رمضان، مع إفادة المنظمين بارتفاع حاد في عدد الأسر التي تطلب المساعدة وسط ارتفاع تكاليف المعيشة.",
      body: [
        "توسّعت مطابخ خيرية وتوزيعات غذاء ينظمها المجتمع بشكل كبير عبر عدة مدن صومالية هذا رمضان، مع إفادة المنظمين بارتفاع حاد في عدد الأسر التي تطلب المساعدة وسط ارتفاع تكاليف المعيشة، وفي مناطق متضررة من الجفاف، انعدام أمن غذائي حاد. وقالت لجان المساجد وجمعيات الأحياء التي توزع عادة كميات متواضعة من الطعام إن الطلب هذا العام تجاوز أي شيء نظّمته في الذاكرة القريبة.",
        "ويصف متطوعون طوابير طويلة تتشكل قبل الإفطار بوقت طويل في أحياء عدة، مع توزيع المنظمين تبرعات محدودة على عدد متزايد من الأسر. وقال كثيرون إنهم اضطروا لتقليص حجم الحصص الفردية لخدمة مزيد من الأسر، حتى مع ارتفاع إجمالي التبرعات من شركات محلية ومساهمين من الشتات مقارنة بالسنوات السابقة.",
        "وأدى عطاء الشتات دوراً كبيراً في استدامة هذه الجهود، مع تنسيق عدة حملات خيرية في معظمها عبر نداءات على وسائل التواصل الاجتماعي أتاحت لأقارب في الخارج التبرع مباشرة لمطابخ أحياء محددة بدلاً من عبر منظمات إغاثة كبيرة. ويقول المنظمون إن هذا النموذج المباشر بنى ثقة، إذ يستطيع المتبرعون رؤية صور وتحديثات تُظهر بالضبط كيف استُخدمت الأموال.",
        "ويحذّر منسقو الإغاثة من أن الكرم المدفوع برمضان، رغم أهميته، ليس بديلاً عن استجابة إنسانية مستدامة للجفاف الكامن والضغوط الاقتصادية التي تولّد الحاجة. وحثّوا على اهتمام وتمويل مستمرين إلى ما بعد الشهر الفضيل بكثير، وهي فترة اعتاد فيها تركيز الجمهور والمانحين على الجوع في الصومال أن يتلاشى تاريخياً.",
      ],
    },
  },

  // ============ INTERNATIONAL 1 ============
  {
    categoryKey: "international",
    en: {
      title: "Peacekeeping Transitions Prompt Debate Over Africa's Security Future",
      excerpt:
        "As international missions draw down across the continent, governments and analysts are debating who will fill the gap and how stability can be sustained.",
      body: [
        "The gradual drawdown of international peacekeeping and stabilisation missions across parts of Africa has prompted a broad debate about the continent's security future. As external forces reduce their presence or shift their mandates, governments face pressing questions about who will assume responsibility for security and how hard-won gains can be preserved.",
        "The debate reflects a longer-running ambition: for African-led solutions to African security challenges. Regional organisations and national armies have increasingly taken on roles once filled by international missions, a shift many welcome in principle. In practice, however, capacity, funding, and coordination remain significant constraints.",
        "The transitions carry risk. A drawdown that outpaces the readiness of local forces can create vacuums that armed groups exploit. Analysts warn that timelines driven by the budgets and politics of distant capitals do not always align with conditions on the ground, where the consequences of a premature withdrawal are borne locally.",
        "Sustaining stability, many argue, requires more than troops — it depends on governance, economic opportunity, and institutions that can hold. The question facing the continent is not simply who provides security in the short term, but how to build the durable foundations that make large external missions unnecessary in the first place.",
      ],
    },
    so: {
      title: "Wareejinta Nabad-ilaalinta oo Kicisay Dood ku saabsan Mustaqbalka Amniga Afrika",
      excerpt:
        "Marka howlgallada caalamiga ah ay hoos u dhacayaan qaaradda oo dhan, dowladaha iyo falanqeeyayaashu waxay ka doodayaan cidda buuxin doonta farqiga iyo sida xasilloonida loo sii wadi karo.",
      body: [
        "Hoos-u-dhaca tartiibka ah ee howlgallada nabad-ilaalinta iyo xasillinta caalamiga ah ee qaybo ka mid ah Afrika ayaa kiciyay dood ballaadhan oo ku saabsan mustaqbalka amniga qaaradda. Marka ciidamada dibaddu ay yareeyaan joogitaankooda ama beddelaan hawlahooda, dowladuhu waxay wajahayaan su'aalo degdeg ah oo ku saabsan cidda qaadan doonta mas'uuliyadda amniga iyo sida faa'iidooyinka si adag loo helay loo ilaalin karo.",
        "Dooddu waxay ka tarjumaysaa hammi muddo-dheer ah: xalal Afrikaan uu hoggaamiyo oo loogu talagalay caqabadaha amniga Afrika. Ururrada gobolka iyo ciidamada qaranka ayaa si sii kordheysa u qaatay doorar mar ay buuxin jireen howlgallada caalamiga ah, isbeddel dad badani ay mabda' ahaan soo dhoweeyaan. Ficil ahaan, si kastaba ha ahaatee, awoodda, maalgelinta, iyo isku-duubnidu waxay weli yihiin xaddidaado waaweyn.",
        "Wareejintu waxay wataa khatar. Hoos-u-dhac ka dhaqso badan diyaargarowga ciidamada maxalliga ah ayaa abuuri kara meelo bannaan oo kooxuhu hubaysan ay ka faa'iidaystaan. Falanqeeyayaashu waxay ka digayaan in jadwalyada ay wadaan miisaaniyadaha iyo siyaasadaha caasimadaha fog ayan had iyo jeer la jaanqaadin xaaladaha dhulka ah, halkaas oo cawaaqibka ka-bixitaan hore la xambaaro maxalli ahaan.",
        "Sii-wadista xasilloonida, dad badani waxay ku doodaan, waxay u baahan tahay wax ka badan ciidamo — waxay ku xiran tahay maamul, fursad dhaqaale, iyo hay'ado hayn kara. Su'aasha qaaradda wajahaysaa ma aha oo kaliya cidda bixisa amniga muddada gaaban, laakiin sida loo dhiso aasaasyada waara ee ka dhigaya howlgallada dibadeed ee waaweyn kuwo aan looga baahnayn meesha koowaad.",
      ],
    },
    ar: {
      title: "انتقالات حفظ السلام تثير نقاشاً حول مستقبل أمن أفريقيا",
      excerpt:
        "مع انسحاب البعثات الدولية عبر القارة، تتناقش الحكومات والمحللون حول من سيملأ الفراغ وكيف يمكن الحفاظ على الاستقرار.",
      body: [
        "أثار الانسحاب التدريجي لبعثات حفظ السلام والاستقرار الدولية عبر أجزاء من أفريقيا نقاشاً واسعاً حول مستقبل أمن القارة. فمع تقليص القوات الخارجية لوجودها أو تغيير مهامها، تواجه الحكومات أسئلة ملحّة حول من سيتولى مسؤولية الأمن وكيف يمكن الحفاظ على المكاسب التي تحققت بصعوبة.",
        "يعكس النقاش طموحاً أطول أمداً: حلولاً بقيادة أفريقية للتحديات الأمنية الأفريقية. فقد تولّت المنظمات الإقليمية والجيوش الوطنية بشكل متزايد أدواراً كانت تملؤها البعثات الدولية، وهو تحول يرحّب به كثيرون من حيث المبدأ. لكن عملياً، تبقى القدرة والتمويل والتنسيق قيوداً كبيرة.",
        "تحمل الانتقالات مخاطر. فالانسحاب الذي يسبق جاهزية القوات المحلية قد يخلق فراغات تستغلها الجماعات المسلحة. ويحذّر المحللون من أن الجداول الزمنية التي تحرّكها ميزانيات وسياسات عواصم بعيدة لا تتوافق دائماً مع الظروف على الأرض، حيث تُتحمّل عواقب الانسحاب المبكر محلياً.",
        "الحفاظ على الاستقرار، كما يرى كثيرون، يتطلب أكثر من قوات — إذ يعتمد على الحوكمة والفرص الاقتصادية والمؤسسات القادرة على الصمود. والسؤال الذي يواجه القارة ليس ببساطة من يوفّر الأمن على المدى القصير، بل كيف تُبنى الأسس الدائمة التي تجعل البعثات الخارجية الكبيرة غير ضرورية من الأساس.",
      ],
    },
  },

  // ============ INTERNATIONAL 2 ============
  {
    categoryKey: "international",
    en: {
      title: "Horn of Africa Diplomacy Enters Delicate Phase Amid Ethiopia-Eritrea Tensions",
      excerpt:
        "Renewed friction between Ethiopia and Eritrea is raising concern among regional diplomats about spillover effects across a Horn of Africa already managing multiple overlapping crises.",
      body: [
        "Renewed diplomatic friction between Ethiopia and Eritrea has raised concern among regional diplomats about potential spillover effects across a Horn of Africa already managing multiple overlapping crises, from Sudan's ongoing conflict to Somalia's political transition and recurring drought across the wider region. Regional bodies have urged both governments toward de-escalation.",
        "At the centre of the tension is longstanding disagreement over access to sea ports, an issue that has periodically resurfaced since Eritrea's independence and gained fresh urgency amid Ethiopia's growing economic reliance on neighbouring ports for trade. Analysts describe the dispute as one of several unresolved fault lines inherited from the region's complex post-independence history.",
        "Regional diplomats say the stakes extend well beyond the two countries directly involved. A serious deterioration in Ethiopia-Eritrea relations could complicate coordination on shared security challenges, including counterterrorism cooperation and humanitarian corridors that cross both countries' territory, at a moment when the wider region can ill afford new instability.",
        "Officials from regional and international bodies have offered to facilitate dialogue, though previous mediation efforts in the relationship have had mixed success. For now, diplomats say the situation remains one to watch closely rather than an active crisis, but caution that the underlying disagreements have proven durable and difficult to permanently resolve.",
      ],
    },
    so: {
      title: "Diblumaasiyadda Geeska Afrika oo Gashay Marxalad Nafis ah iyadoo Xiisad u Dhexeysa Itoobiya iyo Eritreeya",
      excerpt:
        "Xiisad diblumaasiyadeed oo dib u soo noqotay oo u dhexeysa Itoobiya iyo Eritreeya ayaa welwel ka dhalisay diblumaasiyiinta gobolka ku saabsan saameyn dhinac ka baxsan oo ku dhaca Geeska Afrika oo horeba u maareynaya dhowr azaamo isdulsaaran.",
      body: [
        "Xiisad diblumaasiyadeed oo dib u soo noqotay oo u dhexeysa Itoobiya iyo Eritreeya ayaa welwel ka dhalisay diblumaasiyiinta gobolka ku saabsan saameyn suurtogal ah oo dhinac ka baxsan oo ku dhaca Geeska Afrika oo horeba u maareynaya dhowr azaamo isdulsaaran, laga bilaabo colaadda socota ee Suudaan ilaa kala-guurka siyaasadeed ee Soomaaliya iyo abaaraha soo noqnoqda ee gobolka ballaadhan. Hay'adaha gobolku waxay ku dhiirrigeliyeen labada dowladood inay u dhaqaaqaan yaraynta xiisadda.",
        "Xudunta xiisaddu waxay tahay khilaaf muddo dheer ah oo ku saabsan gelitaanka dekedaha badda, arrin marar soo noqnoqotay tan iyo madax-bannaanida Eritreeya oo hadda helay degdeg cusub iyadoo Itoobiya ay sii kordhinayso ku-tiirsanaanteeda dhaqaale ee dekedaha deriska ku saabsan ganacsiga. Falanqeeyayaashu waxay khilaafka ku tilmaameen mid ka mid ah dhowr xiriir aan xallin ah oo laga dhaxlay taariikhda dhib badan ee gobolka ka dib madax-bannaanida.",
        "Diblumaasiyiinta gobolku waxay sheegeen in halistu ay ka fog tahay labada dal ee si toos ah ku lug leh. Sii xumaanshaha xiisad daran ee xiriirka Itoobiya-Eritreeya ayaa laga yaabaa inuu dhibo isku-duwidda caqabadaha amniga la wadaago, oo ay ku jiraan iskaashiga ka-hortagga argagixisada iyo marinnada bini'aadantinimo ee dhex marra dhulka labada dal, xilli gobolka ballaadhan uusan awoodin xasillooni-darro cusub.",
        "Saraakiisha hay'adaha gobolka iyo caalamigu waxay bixiyeen inay fududeeyaan wadahadal, in kastoo dadaalladii dhexdhexaadinta ee hore ee xiriirka ay yeesheen guul isku dhafan. Hadda, diblumaasiyiintu waxay sheegeen in xaaladdu ay wali tahay mid si dhow loo dabagalayo halkii ay ka ahaan lahayd azaan firfircoon, laakiin waxay ka digeen in khilaafyada hoosta taal ay muujiyeen waaraaya oo adag inay si joogto ah loo xalliyo.",
      ],
    },
    ar: {
      title: "دبلوماسية القرن الأفريقي تدخل مرحلة حساسة وسط توترات إثيوبية-إريترية",
      excerpt:
        "يثير احتكاك متجدد بين إثيوبيا وإريتريا قلقاً لدى دبلوماسيين إقليميين بشأن تداعيات محتملة عبر قرن أفريقي يدير بالفعل أزمات متعددة متداخلة.",
      body: [
        "أثار احتكاك دبلوماسي متجدد بين إثيوبيا وإريتريا قلقاً لدى دبلوماسيين إقليميين بشأن تداعيات محتملة عبر قرن أفريقي يدير بالفعل أزمات متعددة متداخلة، من الصراع المستمر في السودان إلى الانتقال السياسي في الصومال والجفاف المتكرر في المنطقة الأوسع. وحثّت هيئات إقليمية الحكومتين على نزع فتيل التوتر.",
        "ويكمن في صميم التوتر خلاف طويل الأمد حول الوصول إلى الموانئ البحرية، وهي قضية تعود إلى الظهور بشكل دوري منذ استقلال إريتريا واكتسبت إلحاحاً جديداً مع تزايد اعتماد إثيوبيا الاقتصادي على موانئ الجوار للتجارة. ويصف محللون النزاع بأنه أحد عدة خطوط صدع لم تُحل ورثتها المنطقة من تاريخها المعقد بعد الاستقلال.",
        "ويقول دبلوماسيون إقليميون إن المخاطر تتجاوز كثيراً البلدين المعنيين مباشرة. فتدهور جدي في العلاقات الإثيوبية-الإريترية قد يعقّد التنسيق بشأن تحديات أمنية مشتركة، بما في ذلك التعاون في مكافحة الإرهاب والممرات الإنسانية التي تعبر أراضي البلدين، في وقت لا تحتمل فيه المنطقة الأوسع عدم استقرار جديد.",
        "وعرض مسؤولون من هيئات إقليمية ودولية تيسير الحوار، رغم أن جهود وساطة سابقة في العلاقة حققت نجاحاً متبايناً. وحالياً، يقول دبلوماسيون إن الوضع لا يزال مسألة تستحق مراقبة دقيقة أكثر من كونه أزمة نشطة، لكنهم يحذّرون من أن الخلافات الكامنة أثبتت أنها راسخة وصعبة الحل نهائياً.",
      ],
    },
  },

  // ============ INTERNATIONAL 3 ============
  {
    categoryKey: "international",
    en: {
      title: "Global Humanitarian Funding Gap Widens as Crises Multiply Faster Than Donations",
      excerpt:
        "Aid agencies say a growing gap between global needs and available funding is forcing painful choices, with crises multiplying faster than donations can keep pace.",
      body: [
        "The United Nations and partner relief organisations have warned of a widening gap between humanitarian needs worldwide and the funding available to meet them. As conflicts, climate shocks and displacement multiply across multiple regions simultaneously, agencies say donations are failing to keep pace, forcing difficult decisions about who receives assistance and who does not.",
        "The shortfall has concrete consequences on the ground. Underfunded programmes have been forced to cut food rations, scale back medical services, and suspend support for some of the world's most vulnerable populations. Aid workers describe painful arithmetic in rationing limited resources across needs that all feel urgent.",
        "Several factors are converging. The number and intensity of simultaneous crises has grown, while some traditional donor governments face domestic budget pressure and shifting political priorities. The result is that annual appeals routinely close having raised only a fraction of what agencies say is required.",
        "Humanitarian leaders have urged donors to broaden the base of contributors and invest more in prevention and resilience, arguing that early action costs far less than emergency response. But for affected communities, the immediate reality is stark: as needs rise and funding lags, the margin between survival and catastrophe grows thinner.",
      ],
    },
    so: {
      title: "Farqiga Maalgelinta Bini'aadantinimo ee Caalamiga ah oo Sii Ballaadhaya iyadoo Azaammadu ka Dhaqso Badnaan Deeqaha",
      excerpt:
        "Hay'adaha gargaarku waxay sheegayaan in farqi sii kordhaya oo u dhexeeya baahiyaha caalamiga ah iyo maalgelinta la heli karo uu qasbayo doorashooyin xanuun leh, iyadoo azaammadu ay ka sii badanayaan sida deeqaha loo raadin karo.",
      body: [
        "Qaramada Midoobay iyo hay'adaha gargaarka la shaqeeya ayaa ka digay farqi sii ballaadhaya oo u dhexeeya baahiyaha bini'aadantinimo ee adduunka iyo maalgelinta la heli karo si loo daboolo. Iyadoo colaadaha, naaftooyinka cimilada iyo barakaca ay sii badanayaan gobollo badan isku mar, hay'aduhu waxay sheegayaan in deeqahu ay ku guuldareystaan inay la socdaan, taasoo qasbaysa go'aammo adag oo ku saabsan cidda gargaarka helaysa iyo cidda aan helaynin.",
        "Yaraantu waxay leedahay saameyn dhab ah oo dhulka ka jirta. Barnaamijyada maalgelin-yari haysta ayaa lagu qasbay inay gooyaan qaybaha cuntada, ay yareeyaan adeegyada caafimaad, oo ay joojiyaan taageerada qaar ka mid ah dadka adduunka ugu nugul. Shaqaalaha gargaarku waxay sheegayaan xisaab xanuun leh oo ah in kheyraadka xaddidan lagu qaybiyo baahiyo dhammaantood dareen degdeg ah leh.",
        "Dhowr arrimood ayaa isku soo dhacaya. Tirada iyo darnaanta azaammada isku mar dhaca ayaa kordhay, halka qaar ka mid ah dowladaha deeq-bixiyeyaasha dhaqameed ay wajahaan cadaadis miisaaniyadeed oo gudaha ah iyo mudnaan siyaasadeed oo isbeddela. Natiijadu waa in baaqyada sannadlaha ahi ay caadi ahaan ku dhammaadaan iyagoo soo ururiyay kaliya qayb ka mid ah waxa hay'aduhu sheegayaan inay lagama maarmaan yihiin.",
        "Hoggaamiyeyaasha bini'aadantinimadu waxay ku dhiirrigeliyeen deeqbixiyeyaasha inay ballaadhiyaan asalka wax-bixiyeyaasha oo ay si badan ugu maalgeliyaan ka-hortagga iyo adkaysiga, iyagoo ku doodaya in ficilka hore uu kharashkiisu ka yar yahay kan jawaabta degdegga ah. Laakiin bulshooyinka saameeya, xaqiiqada isla markiiba jirtaa waa mid cad: marka baahidu kordho maalgelintuna ay dib maro, tirtiga u dhexeeya badbaadada iyo masiibada ayaa sii kaahaya.",
      ],
    },
    ar: {
      title: "فجوة التمويل الإنساني العالمي تتسع مع تضاعف الأزمات أسرع من التبرعات",
      excerpt:
        "تقول وكالات الإغاثة إن فجوة متنامية بين الاحتياجات والتمويل المتاح تفرض خيارات مؤلمة، مع تكاثر الأزمات أسرع من قدرة التبرعات على مواكبتها.",
      body: [
        "حذّرت الأمم المتحدة ومنظمات الإغاثة الشريكة من اتساع الفجوة بين الاحتياجات الإنسانية حول العالم والتمويل المتاح لتلبيتها. فمع تكاثر النزاعات والصدمات المناخية والنزوح عبر مناطق متعددة، تقول الوكالات إن التبرعات تعجز عن المواكبة، ما يفرض قرارات صعبة بشأن من يتلقى المساعدة ومن يبقى من دونها.",
        "للعجز عواقب حقيقية على الأرض. فقد اضطُرت البرامج ناقصة التمويل إلى خفض الحصص الغذائية، وتقليص الخدمات الطبية، وتعليق الدعم لبعض أكثر سكان العالم هشاشة. ويصف عمال الإغاثة الحساب المؤلم لتقنين موارد محدودة عبر احتياجات تبدو جميعها ملحّة.",
        "تتضافر عدة عوامل. فقد ازداد عدد الأزمات المتزامنة وحدّتها، بينما تواجه بعض الحكومات المانحة التقليدية ضغوطاً على الميزانية في الداخل وأولويات سياسية متغيرة. والنتيجة أن النداءات تُغلق عادةً كل عام وقد جمعت جزءاً ضئيلاً فقط مما تقول الوكالات إنه مطلوب.",
        "حثّ قادة العمل الإنساني على توسيع قاعدة المانحين وزيادة الاستثمار في الوقاية والقدرة على الصمود، بحجة أن العمل المبكر يكلّف أقل بكثير من الاستجابة الطارئة. لكن بالنسبة للمجتمعات المتضررة، فإن الواقع المباشر قاسٍ: فمع ارتفاع الاحتياجات وتخلّف التمويل، يزداد الهامش بين النجاة والكارثة ضيقاً.",
      ],
    },
  },

  // ============ INTERNATIONAL 4 ============
  {
    categoryKey: "international",
    en: {
      title: "Red Sea Shipping Security Remains Fragile Despite Decline in Attacks",
      excerpt:
        "International naval patrols report a decline in attacks on commercial shipping through the Red Sea corridor, but insurers and shipping lines say confidence in the route's safety remains far from restored.",
      body: [
        "International naval coalitions patrolling the Red Sea and Gulf of Aden corridor report a decline in attacks on commercial shipping compared with the peak disruption of recent years, though shipping lines and maritime insurers caution that confidence in the route's safety remains far from fully restored. Several major carriers have only gradually resumed regular transits after extended periods of rerouting around southern Africa.",
        "The corridor carries a significant share of global trade between Asia and Europe, and prolonged disruption has had ripple effects on shipping costs and delivery times worldwide, with knock-on consequences for consumer prices in importing economies. A sustained return to pre-disruption shipping volumes would matter well beyond the region itself.",
        "Maritime security officials caution that a lull in attacks does not necessarily indicate the underlying threat has been resolved, noting that armed groups operating in the area have previously paused and resumed activity in response to shifting political and military conditions on land. Insurance premiums for vessels transiting the corridor remain elevated compared with pre-crisis levels.",
        "Regional and international navies say patrols will continue at heightened readiness for the foreseeable future, and shipping industry representatives have called for sustained international commitment to security in the corridor, warning that a premature drawdown could quickly reverse recent gains in shipping confidence.",
      ],
    },
    so: {
      title: "Amniga Badda Cas ee Badeeddu wuu Jilicsan yahay In kastoo Weerarradu ay Hoos u Dhaceen",
      excerpt:
        "Ilaalada badda ee caalamiga ah waxay ka warramaan hoos-u-dhac ku yimid weerarrada ka dhanka ah maraakiibta ganacsiga ee marta jidka Badda Cas, laakiin caymiska badda iyo shirkadaha maraakiibtu waxay sheegayaan in kalsoonida amniga jidku aysan weli si buuxda u soo noqonin.",
      body: [
        "Isbahaysiyada ciidamada badda ee caalamiga ah ee ilaalinaya jidka Badda Cas iyo Gacanka Cadmeed ayaa ka warramaya hoos-u-dhac ku yimid weerarrada ka dhanka ah maraakiibta ganacsiga marka la barbar dhigo carqaladihii ugu sarreeyay ee sannadihii la soo dhaafay, in kastoo shirkadaha maraakiibta iyo caymiska badeedku ay ka digayaan in kalsoonida amniga jidku aysan weli si buuxda u soo noqonin. Dhowr shirkadood oo waaweyn ayaa si tartiib ah u soo celiyay socodkooda joogtada ah ka dib muddo dheer oo ah in laga wareego koonfurta Afrika.",
        "Jidku wuxuu qaataa qayb weyn oo ganacsiga caalamiga ah ee u dhexeeya Aasiya iyo Yurub, carqaladeynta muddada dheer ayaana leedahay saameyn ku dhaca kharashka maraakiibta iyo waqtiga gaadhsiinta adduunka oo dhan, iyadoo cawaaqib ku yimaada qiimayaasha macaamiisha dhaqaalayaasha wax soo dejiya. Soo noqoshada joogtada ah ee baaxadda maraakiibta ee ka horeysay carqaladeynta ayaa muhiim u ahaan lahayd wax ka baxsan gobolka lafteeda.",
        "Saraakiisha amniga badeedku waxay ka digayaan in nabad-yartu aysan macnaheedu ahayn in halista hoosta taal la xalliyay, iyagoo xusay in kooxaha hubaysan ee ka shaqeeya aagga ay hore u joojiyeen oo dib u bilaabeen dhaqdhaqaaqooda jawaab ahaan xaaladaha siyaasadeed iyo militari ee isbeddela ee dhulka. Qiimaha caymiska maraakiibta marta jidku ayaa weli sarreeya marka la barbar dhigo heerarkii ka horeeyay azaanka.",
        "Ciidamada badda ee gobolka iyo caalamigu waxay sheegeen in ilaalada ay sii wadi doonaan diyaarnimo sare mustaqbalka la arki karo, wakiillada warshadaha maraakiibtuna waxay ku dalbadeen ballan-qaad caalami oo sii socda oo amniga jidka ah, iyagoo ka digay in dib-u-dhac hore uu si degdeg ah u rogi karo faa'iidooyinkii dhawaan lagu helay kalsoonida maraakiibta.",
      ],
    },
    ar: {
      title: "أمن الشحن في البحر الأحمر يبقى هشاً رغم تراجع الهجمات",
      excerpt:
        "تفيد دوريات بحرية دولية بتراجع الهجمات على السفن التجارية عبر ممر البحر الأحمر، لكن شركات التأمين والملاحة تقول إن الثقة بسلامة الطريق لا تزال بعيدة عن الاستعادة الكاملة.",
      body: [
        "تفيد تحالفات بحرية دولية تسيّر دوريات في ممر البحر الأحمر وخليج عدن بتراجع الهجمات على السفن التجارية مقارنة بذروة الاضطراب في السنوات الأخيرة، رغم تحذير خطوط الشحن وشركات التأمين البحري من أن الثقة بسلامة الطريق لا تزال بعيدة عن الاستعادة الكاملة. واستأنفت عدة شركات نقل كبرى بشكل تدريجي فقط عبورها المنتظم بعد فترات ممتدة من تغيير المسار حول جنوب أفريقيا.",
        "ويحمل الممر حصة كبيرة من التجارة العالمية بين آسيا وأوروبا، وكان للاضطراب الممتد تأثيرات متتالية على تكاليف الشحن وأوقات التسليم عالمياً، مع عواقب لاحقة على أسعار المستهلكين في اقتصادات مستوردة. وعودة مستدامة إلى أحجام الشحن ما قبل الاضطراب ستكون مهمة إلى ما هو أبعد من المنطقة نفسها.",
        "ويحذّر مسؤولو الأمن البحري من أن هدوء الهجمات لا يعني بالضرورة أن التهديد الكامن قد حُل، مشيرين إلى أن جماعات مسلحة تعمل في المنطقة أوقفت واستأنفت نشاطها سابقاً استجابة لظروف سياسية وعسكرية متغيرة على البر. وتبقى أقساط التأمين للسفن العابرة للممر مرتفعة مقارنة بمستويات ما قبل الأزمة.",
        "وتقول بحريات إقليمية ودولية إن الدوريات ستستمر بجاهزية مرتفعة في المستقبل المنظور، ودعا ممثلو صناعة الشحن إلى التزام دولي مستدام بالأمن في الممر، محذّرين من أن انسحاباً مبكراً قد يعكس بسرعة المكاسب الأخيرة في ثقة الشحن.",
      ],
    },
  },

  // ============ INTERNATIONAL 5 ============
  {
    categoryKey: "international",
    en: {
      title: "Gulf Investment Interest in Horn of Africa Ports Intensifies Amid Regional Competition",
      excerpt:
        "Gulf state-backed investors are competing for stakes in Horn of Africa port infrastructure, drawn by strategic shipping lanes and long-term trade ambitions across the region.",
      body: [
        "Investment interest from Gulf-based state and private entities in Horn of Africa port infrastructure has intensified, with multiple competing bids and partnership proposals under discussion across the region's coastal states. The interest reflects both the strategic value of ports positioned along major shipping lanes and longer-term ambitions to secure trade and logistics footholds in a fast-growing region.",
        "Analysts note that competition among Gulf investors, rather than a single coordinated approach, has in some cases given regional governments unusual leverage in negotiations, with multiple suitors offering competing terms for port concessions, free-zone development, and associated infrastructure like roads and rail links to the interior.",
        "The dynamic carries risk as well as opportunity for host governments. Analysts caution that agreements struck quickly amid competitive pressure can sometimes favour investors on terms that prove less advantageous once initial enthusiasm cools, and have urged host governments to insist on transparent bidding processes and independent technical review before finalising major concessions.",
        "For coastal communities near proposed developments, the promise of jobs and infrastructure investment is significant, though local officials in several locations have also raised concerns about environmental review processes and the pace at which agreements are being negotiated relative to public consultation.",
      ],
    },
    so: {
      title: "Xiisaha Maalgashiga Khaliijka ee Dekedaha Geeska Afrika oo Sii Kordhay Xilli Tartan Gobol ah",
      excerpt:
        "Maalgeliyeyaal ay taageerto dowladaha Khaliijka iyo kuwo gaar ah ayaa isku tartamaya saamiyo ka mid ah kaabayaasha dekedaha Geeska Afrika, iyagoo soo jiitay jidadka maraakiibta istaraatiijiga ah iyo hammiga ganacsi ee muddo-dheer ee gobolka.",
      body: [
        "Xiisaha maalgashiga ee ka yimid hay'adaha dowladeed iyo kuwa gaarka ah ee Khaliijka ku saabsan kaabayaasha dekedaha Geeska Afrika ayaa sii kordhay, iyadoo dhowr codsi oo iska soo horjeeda iyo soo jeedin iskaashi ay ka dhex socoto dowladaha xeebaha gobolka. Xiisaha wuxuu ka tarjumayaa qiimaha istaraatiijiga ah ee dekedaha ku yaal jidadka maraakiibta ee waaweyn iyo hammi muddo-dheer ah oo lagu doonayo in la hesho lugta ganacsi iyo saadka gobol si degdeg ah u koraya.",
        "Falanqeeyayaashu waxay xusuu in tartanka maalgeliyeyaasha Khaliijka, halkii ay ka ahaan lahayd hab hal-mid ah oo isku-duwan, ay xaalado qaarkood siisay dowladaha gobolka awood aan caadi ahayn oo ku saabsan wadahadal, iyadoo doon-yeelayaal badani ay bixinayaan shuruudo iska soo horjeeda oo ku saabsan siidaynta dekedaha, horumarinta aagagga xorta ah, iyo kaabayaasha la xidhiidha sida waddooyinka iyo tareennada gudaha.",
        "Dhaqdhaqaaqu wuxuu wataa khatar iyo fursad labadaba dowladaha martida loo yahay. Falanqeeyayaashu waxay ka digayaan in heshiisyada si degdeg ah lagu gaadho xilli cadaadis tartan ah ay mararka qaarkood door-bidi karaan maalgeliyeyaasha shuruudo noqda kuwo aan faa'iido badan lahayn marka hammiga hore uu qaboobo, waxayna ku dhiirrigeliyeen dowladaha martida loo yahay inay ku adkeystaan geeddi-socodyo tartan oo daahfuran iyo dib-u-eegis farsamo oo madax-bannaan ka hor dhammaystirka siidayn kasta oo weyn.",
        "Bulshooyinka xeebaha ku dhow horumarrada la soo jeediyay, ballanqaadka shaqooyinka iyo maalgelinta kaabayaashu waa mid weyn, in kastoo saraakiisha maxalliga ah ee meelo dhowr ah ay sidoo kale kiciyeen welwel ku saabsan geeddi-socodyada dib-u-eegista deegaanka iyo xawaaraha ay heshiisyadu ku wadahadlayaan marka la barbar dhigo la-tashiga dadweynaha.",
      ],
    },
    ar: {
      title: "الاهتمام الاستثماري الخليجي بموانئ القرن الأفريقي يتصاعد وسط تنافس إقليمي",
      excerpt:
        "يتنافس مستثمرون مدعومون من دول خليجية على حصص في البنية التحتية لموانئ القرن الأفريقي، مدفوعين بممرات شحن استراتيجية وطموحات تجارية طويلة الأمد عبر المنطقة.",
      body: [
        "تصاعد الاهتمام الاستثماري من كيانات حكومية وخاصة خليجية بالبنية التحتية لموانئ القرن الأفريقي، مع مناقشة عروض ومقترحات شراكة متنافسة متعددة عبر الدول الساحلية في المنطقة. ويعكس الاهتمام القيمة الاستراتيجية للموانئ الواقعة على ممرات شحن رئيسية وطموحات أطول أمداً لتأمين مواطئ قدم تجارية ولوجستية في منطقة سريعة النمو.",
        "ويشير محللون إلى أن التنافس بين مستثمرين خليجيين، بدلاً من نهج منسّق واحد، منح في بعض الحالات حكومات إقليمية نفوذاً غير معتاد في المفاوضات، مع تقديم عدة طامحين شروطاً متنافسة لامتيازات الموانئ وتطوير مناطق حرة وبنية تحتية مرتبطة كالطرق وخطوط السكك الحديدية إلى الداخل.",
        "وتحمل هذه الديناميكية مخاطر إلى جانب الفرص للحكومات المضيفة. ويحذّر محللون من أن اتفاقيات تُبرم بسرعة وسط ضغط تنافسي قد تحابي أحياناً المستثمرين بشروط تثبت أنها أقل فائدة بمجرد تراجع الحماس الأولي، وحثّوا الحكومات المضيفة على الإصرار على عمليات مناقصة شفافة ومراجعة تقنية مستقلة قبل إبرام أي امتياز كبير.",
        "وبالنسبة للمجتمعات الساحلية القريبة من التطويرات المقترحة، فإن وعد الوظائف والاستثمار في البنية التحتية كبير، رغم أن مسؤولين محليين في عدة مواقع أثاروا أيضاً مخاوف بشأن عمليات المراجعة البيئية ووتيرة التفاوض على الاتفاقيات مقارنة بالتشاور العام.",
      ],
    },
  },

  // ============ INTERNATIONAL 6 ============
  {
    categoryKey: "international",
    en: {
      title: "UN Security Council Reviews Somalia Sanctions Regime Amid Calls for Recalibration",
      excerpt:
        "The Security Council held its periodic review of the arms embargo and related sanctions measures on Somalia, with member states divided over whether current restrictions still match the country's security needs.",
      body: [
        "The UN Security Council held its periodic review of the arms embargo and related sanctions measures affecting Somalia, with member states divided over whether the current restrictions still match the country's evolving security needs as Somali forces gradually assume responsibilities previously held by international troops. The review comes amid a broader push by Mogadishu for further easing of the decades-old embargo.",
        "Somali officials have long argued that embargo restrictions, originally imposed amid the state collapse of the early 1990s, now hamper the government's ability to adequately arm and equip national forces at a critical moment in the security transition, and have lobbied for a full and permanent lifting of remaining measures.",
        "Some council members expressed support for further easing, citing improved government oversight of weapons and ammunition management systems developed in cooperation with international partners in recent years. Others urged continued caution, pointing to ongoing concerns about weapons diversion risk in a security environment still marked by fragmented command structures.",
        "No decision was reached at this session, with several members requesting additional technical briefings on Somalia's weapons management capacity before further council action. Diplomats say the debate reflects a broader tension between supporting Somali sovereignty over its own security and managing residual risk in a still-fragile environment.",
      ],
    },
    so: {
      title: "Golaha Ammaanka Qaramada Midoobay oo Dib u Eegay Nidaamka Cunaqabateynta Soomaaliya iyadoo Loo Baaqayo In la Hagaajiyo",
      excerpt:
        "Golaha Ammaanku wuxuu qabtay dib-u-eegistiisii joogtada ahayd ee mamnuuca hubka iyo cabbirrada cunaqabateynta la xidhiidha ee Soomaaliya, iyadoo dowladaha xubnaha ka ah ay kala qaybsan yihiin haddii xayiraadaha hadda jira ay wali la jaanqaadaan baahiyaha amniga dalka.",
      body: [
        "Golaha Ammaanka Qaramada Midoobay ayaa qabtay dib-u-eegistiisii joogtada ahayd ee mamnuuca hubka iyo cabbirrada cunaqabateynta la xidhiidha ee saameeya Soomaaliya, iyadoo dowladaha xubnaha ka ah ay kala qaybsan yihiin haddii xayiraadaha hadda jira ay wali la jaanqaadaan baahiyaha amniga dalka ee isbeddelaya maadaama ciidamada Soomaaliyeed ay si tartiib ah u qaataan mas'uuliyadihii hore ay haysteen ciidamada caalamiga ah. Dib-u-eegistu waxay imanaysaa iyadoo Muqdisho ay sii wadeyso dadaal ballaadhan oo lagu doonayo in la sii yareeyo mamnuucii tobannaan sano jiray.",
        "Saraakiisha Soomaaliyeed ayaa muddo dheer ku dooday in xayiraadaha mamnuuca, oo markii hore lagu soo rogay burburka dawladnimo ee horraantii 1990-meeyadii, hadda ay carqaladeeyaan awoodda dowladda ee ay ku hubeyso oo ku qalabeyso ciidamada qaranka si ku filan xilli muhiim ah oo ka mid ah kala-guurka amniga, waxayna u ololeeyeen in si buuxda oo joogto ah loo qaado cabbirrada hadhay.",
        "Xubno ka mid ah golaha ayaa muujiyay taageero yaraynta dheeraadka ah, iyagoo xusay kormeer dowladeed oo hagaagay ee ku saabsan nidaamyada maareynta hubka iyo rasaasta oo lala sameeyay shurakada caalamiga ah sanadihii u dambeeyay. Kuwo kalena waxay ku dhiirrigeliyeen taxaddar sii socota, iyagoo tilmaamaya welwel sii socda oo ku saabsan khatarta leexinta hubka jawi amni oo weli calaamadaysan qaab-dhismeedyo amar oo kala jajaban.",
        "Go'aan kama gaarin kulankan, iyadoo dhowr xubnood ay dalbadeen wargelin farsamo oo dheeraad ah oo ku saabsan awoodda maareynta hubka ee Soomaaliya ka hor tallaabo golaha dheeraad ah. Diblumaasiyiintu waxay sheegeen in dooddu ka tarjumayso xiisad ballaadhan oo u dhexeysa taageeridda madax-bannaanida Soomaaliya ee amnigeeda iyo maareynta khatarta hadhaysa jawi wali jilicsan.",
      ],
    },
    ar: {
      title: "مجلس الأمن الدولي يراجع نظام العقوبات على الصومال وسط دعوات لإعادة تقييم",
      excerpt:
        "عقد مجلس الأمن مراجعته الدورية لحظر توريد الأسلحة وتدابير العقوبات المرتبطة به على الصومال، مع انقسام الدول الأعضاء حول ما إذا كانت القيود الحالية لا تزال تلائم احتياجات البلاد الأمنية.",
      body: [
        "عقد مجلس الأمن الدولي مراجعته الدورية لحظر توريد الأسلحة وتدابير العقوبات المرتبطة به التي تؤثر على الصومال، مع انقسام الدول الأعضاء حول ما إذا كانت القيود الحالية لا تزال تلائم احتياجات البلاد الأمنية المتطورة مع تولي القوات الصومالية تدريجياً مسؤوليات كانت بيد قوات دولية سابقاً. وتأتي المراجعة وسط دفعة أوسع من مقديشو لمزيد من تخفيف الحظر القائم منذ عقود.",
        "ويجادل مسؤولون صوماليون منذ زمن طويل بأن قيود الحظر، التي فُرضت أصلاً وسط انهيار الدولة في أوائل التسعينيات، تعيق الآن قدرة الحكومة على تسليح وتجهيز القوات الوطنية بشكل كافٍ في لحظة حاسمة من الانتقال الأمني، ومارسوا ضغوطاً لرفع كامل ودائم للتدابير المتبقية.",
        "وأعرب بعض أعضاء المجلس عن دعمهم لمزيد من التخفيف، مستشهدين بتحسّن الرقابة الحكومية على أنظمة إدارة الأسلحة والذخيرة التي طُوّرت بالتعاون مع شركاء دوليين في السنوات الأخيرة. وحثّ آخرون على مواصلة الحذر، مشيرين إلى مخاوف مستمرة بشأن خطر تحويل وجهة الأسلحة في بيئة أمنية لا تزال تتسم بهياكل قيادة مجزأة.",
        "ولم يُتوصل إلى قرار في هذه الجلسة، مع طلب عدة أعضاء إحاطات تقنية إضافية بشأن قدرة الصومال على إدارة الأسلحة قبل أي إجراء إضافي من المجلس. ويقول دبلوماسيون إن النقاش يعكس توتراً أوسع بين دعم سيادة الصومال على أمنه الخاص وإدارة المخاطر المتبقية في بيئة لا تزال هشة.",
      ],
    },
  },

  // ============ INTERNATIONAL 7 ============
  {
    categoryKey: "international",
    en: {
      title: "Global Grain Price Swings Ripple Through Import-Dependent Horn of Africa Economies",
      excerpt:
        "Volatility in international wheat and grain markets is feeding directly into food prices across Horn of Africa nations that rely heavily on imports, compounding pressure on households already coping with drought.",
      body: [
        "Volatility in international wheat and grain markets is feeding directly into consumer food prices across Horn of Africa economies that depend heavily on imports to meet domestic demand, compounding pressure on households already coping with drought-driven food insecurity in several countries. Economists note that the region's structural reliance on imported staples leaves it acutely exposed to price swings driven by events far beyond its control.",
        "Recent price movements have been driven by a mix of factors, including weather disruptions in major exporting regions, shifting export policies among key grain-producing countries, and elevated shipping and insurance costs tied to disruptions along key maritime corridors. For import-dependent economies, even modest global price increases translate quickly into higher bread and flour prices at local markets.",
        "Governments across the region have responded with a mix of measures, including temporary import duty adjustments and, in some cases, strategic grain reserve releases, though officials acknowledge such tools offer only partial and temporary relief against sustained global price pressure. Longer-term food security strategies increasingly emphasise diversifying import sources and expanding domestic production capacity.",
        "Agricultural economists caution that boosting local production faces real constraints, from land and water availability to persistent underinvestment in rural infrastructure, meaning import dependence — and the vulnerability that comes with it — is likely to persist for years even as governments pursue longer-term diversification strategies.",
      ],
    },
    so: {
      title: "Isbeddelka Qiimaha Hadhuudhka Caalamiga ah oo Saameeya Dhaqaalayaasha Geeska Afrika ee ku Tiirsan Soo-dejinta",
      excerpt:
        "Kala-fluctation-ka suuqyada sarreenka iyo hadhuudhka caalamiga ah ayaa si toos ah u saameynaya qiimaha cuntada ee dalalka Geeska Afrika ee si weyn ugu tiirsan soo-dejinta, taasoo sii kordhinaysa cadaadiska qoysaska horeba u la macaamilaya abaarta.",
      body: [
        "Kala-fluctation-ka suuqyada sarreenka iyo hadhuudhka caalamiga ah ayaa si toos ah u saameynaya qiimayaasha cuntada macaamiisha ee dhaqaalayaasha Geeska Afrika ee si weyn ugu tiirsan soo-dejinta si ay ula kulmaan baahida gudaha, taasoo sii kordhinaysa cadaadiska qoysaska horeba ula macaamilaya sii-daynta cuntada oo abaartu keentay dalal badan. Dhaqaale-yahannadu waxay xusuu in ku-tiirsanaanta qaab-dhismeedka gobolka ee alaabta soo-dejinta ay ka dhigto mid si aad ah u nugul isbeddellada qiimaha ee ay wado dhacdooyin aad uga baxsan gacanteeda.",
        "Dhaqdhaqaaqyada qiimaha ee dhawaan la arkay waxaa waday isku-dhaf arrimood, oo ay ku jiraan carqaladaha cimilada ee gobollada dhoofinta waaweyn, isbeddelka siyaasadaha dhoofinta ee dalalka ugu waaweyn ee soo saara hadhuudhka, iyo kharashyada maraakiibta iyo caymiska oo sarreeya oo la xidhiidha carqaladaha ku dhaca jidadka badeed ee muhiimka ah. Dhaqaalayaasha ku tiirsan soo-dejintu, xitaa kororka qiimaha caalamiga ah ee ugu yar wuxuu si degdeg ah ugu beddelmaa qiimo sare oo rooti iyo bur ah oo suuqyada maxalliga ah.",
        "Dowladaha gobolka ayaa ka jawaabay isku-dhaf tallaabooyin ah, oo ay ku jiraan hagaajin ku meel gaar ah oo canshuurta soo-dejinta ah iyo, xaalado qaarkood, sii-daynta kaydka hadhuudhka istaraatiijiga ah, in kastoo saraakiishu ay qirtaan in qalabkaas uu bixiyo gargaar qayb ahaan ah oo ku meel gaadh ka dhanka ah cadaadiska qiimaha caalamiga ee sii socda. Istaraatiijiyadaha amniga cuntada ee muddo-dheer ayaa si sii kordheysa u xoojinaya kala duwanaynta ilaha soo-dejinta iyo balaadhinta awoodda wax-soo-saarka gudaha.",
        "Dhaqaale-yahannada beeraha ayaa ka digaya in kordhinta wax-soo-saarka maxalliga ah ay wajahdo caqabado dhab ah, laga bilaabo helitaanka dhulka iyo biyaha ilaa maalgelin-yari joogto ah oo ku dhaca kaabayaasha miyiga, taasoo macnaheedu yahay in ku-tiirsanaanta soo-dejinta — iyo nuglaanshaha la socda — ay u badan tahay inay sii socoto sanado xitaa iyadoo dowladuhu ay wadaan istaraatiijiyado muddo-dheer oo kala duwanaynta ah.",
      ],
    },
    ar: {
      title: "تقلبات أسعار الحبوب العالمية تنتقل عبر اقتصادات القرن الأفريقي المعتمدة على الاستيراد",
      excerpt:
        "يتسرب تقلب أسواق القمح والحبوب الدولية مباشرة إلى أسعار الغذاء في دول القرن الأفريقي التي تعتمد بشدة على الاستيراد، ما يضاعف الضغط على أسر تتعامل بالفعل مع الجفاف.",
      body: [
        "يتسرب تقلب أسواق القمح والحبوب الدولية مباشرة إلى أسعار الغذاء للمستهلكين في اقتصادات القرن الأفريقي التي تعتمد بشدة على الاستيراد لتلبية الطلب المحلي، ما يضاعف الضغط على أسر تتعامل بالفعل مع انعدام أمن غذائي ناجم عن الجفاف في عدة دول. ويشير اقتصاديون إلى أن الاعتماد البنيوي للمنطقة على سلع أساسية مستوردة يجعلها عرضة بشدة لتقلبات الأسعار الناجمة عن أحداث بعيدة تماماً عن سيطرتها.",
        "ودفعت تحركات الأسعار الأخيرة مزيج من العوامل، منها اضطرابات الطقس في مناطق تصدير رئيسية، وتغيّر سياسات التصدير لدى دول منتجة رئيسية للحبوب، وارتفاع تكاليف الشحن والتأمين المرتبطة باضطرابات على طول ممرات بحرية رئيسية. وبالنسبة للاقتصادات المعتمدة على الاستيراد، فإن حتى ارتفاعات متواضعة في الأسعار العالمية تتحول بسرعة إلى أسعار أعلى للخبز والدقيق في الأسواق المحلية.",
        "وردّت حكومات في أنحاء المنطقة بمزيج من الإجراءات، منها تعديلات مؤقتة على رسوم الاستيراد، وفي بعض الحالات، الإفراج عن احتياطيات حبوب استراتيجية، رغم إقرار مسؤولين بأن هذه الأدوات توفر إغاثة جزئية ومؤقتة فقط أمام ضغط الأسعار العالمية المستمر. وتشدد استراتيجيات الأمن الغذائي طويلة الأمد بشكل متزايد على تنويع مصادر الاستيراد وتوسيع القدرة الإنتاجية المحلية.",
        "ويحذّر اقتصاديون زراعيون من أن تعزيز الإنتاج المحلي يواجه قيوداً حقيقية، من توفر الأرض والمياه إلى نقص استثمار مستمر في البنية التحتية الريفية، ما يعني أن الاعتماد على الاستيراد — والهشاشة المصاحبة له — يُرجّح أن يستمر لسنوات حتى مع سعي الحكومات لاستراتيجيات تنويع طويلة الأمد.",
      ],
    },
  },

  // ============ INTERNATIONAL 8 ============
  {
    categoryKey: "international",
    en: {
      title: "Global Vaccination Drive Expands Reach Into Hard-to-Access Horn of Africa Communities",
      excerpt:
        "An international health initiative has expanded routine childhood vaccination coverage into remote and conflict-affected districts, using mobile teams to reach communities long outside the reach of fixed clinics.",
      body: [
        "An international health initiative has expanded routine childhood vaccination coverage into remote and conflict-affected districts across the Horn of Africa, deploying mobile vaccination teams to reach communities that have long fallen outside the reach of fixed health clinics. Programme coordinators describe the mobile model as essential in a region where security conditions and vast distances have historically left immunisation gaps.",
        "Health officials say the expanded reach has already produced measurable gains in coverage rates for measles, polio and other vaccine-preventable diseases in targeted districts, though they caution that maintaining consistent coverage in areas with periodic insecurity or seasonal access constraints remains an ongoing operational challenge rather than a problem solved once and for all.",
        "The initiative relies heavily on local community health workers who travel with mobile teams and maintain relationships with communities between visits, building trust that programme coordinators say is essential to overcoming vaccine hesitancy rooted in limited prior contact with formal health systems. Community elders have in several districts played an active role in encouraging participation.",
        "Funding for the expanded reach remains only partially secured beyond the current programme cycle, and health officials have urged international donors to commit to multi-year funding rather than the shorter grant cycles that have historically made it difficult to plan sustained outreach into the hardest-to-reach communities.",
      ],
    },
    so: {
      title: "Ololaha Tallaalka Caalamiga ah oo Gaadhsiinaya Bulshooyin Adag in la Gaadho oo ku Yaal Geeska Afrika",
      excerpt:
        "Hindise caafimaad oo caalami ah ayaa balaadhiyay daboolka tallaalka joogtada ah ee carruurta degmooyin fog iyo kuwa colaaddu saameysay, iyadoo isticmaalaysa kooxo tallaal oo soconaya si ay u gaadhaan bulshooyin muddo dheer ka baxsanaa gaadhista xarumaha caafimaad ee go'an.",
      body: [
        "Hindise caafimaad oo caalami ah ayaa balaadhiyay daboolka tallaalka joogtada ah ee carruurta degmooyin fog iyo kuwa colaaddu saameysay ee ku yaal Geeska Afrika, iyadoo diraysa kooxo tallaal oo soconaya si ay u gaadhaan bulshooyin muddo dheer ka baxsanaa gaadhista xarumaha caafimaad ee go'an. Isku-duwayaasha barnaamijku waxay ku tilmaameen qaabka soconaya mid lagama maarmaan ah gobol ay xaaladaha amniga iyo masaafooyinka ballaadhan ay taariikh ahaan ka tageen farqiyo tallaal.",
        "Saraakiisha caafimaadku waxay sheegeen in gaadhista la ballaadhiyay ay hore u soo saartay faa'iidooyin la qiyaasi karo oo ku yimid heerarka daboolka jadeecada, dabaysha-dabaysha iyo cudurrada kale ee tallaalka laga hortagi karo degmooyinka bartilmaameedka ah, in kastoo ay ka digeen in sii-wadista daboolka joogtada ah aagagga leh amni siyaasadeed oo mararka qaarkood carqalad geliya ama xaddidaad gelitaan xilliyeed uu weli yahay caqabad hawleed oo socota halkii uu ka ahaan lahaa dhibaato hal mar loo xalliyay.",
        "Hindisaha wuxuu si weyn ugu tiirsan yahay shaqaalaha caafimaadka bulshada ee maxalliga ah oo la socda kooxaha soconaya oo ilaaliya xidhiidhka bulshooyinka inta u dhaxaysa booqashooyinka, iyagoo dhisaya kalsooni ay isku-duwayaasha barnaamijku sheegeen inay lagama maarmaan tahay in laga gudbo shaki-tallaal ka soo jeeda xidhiidh xaddidan oo hore la yeeshay nidaamyada caafimaadka rasmiga ah. Odayaasha bulshadu waxay degmooyin badan ka ciyaareen door firfircoon oo lagu dhiirrigelinayo ka-qaybgalka.",
        "Maalgelinta gaadhista la ballaadhiyay ayaa weli qayb ahaan la xaqiijiyay wax ka baxsan wareegga barnaamijka ee hadda socda, saraakiisha caafimaaduna waxay ku dhiirrigeliyeen deeqbixiyeyaasha caalamiga ah inay u ballan qaadaan maalgelin sanado badan halkii ay ka ahaan lahaayeen wareegyo deeq oo gaaban oo taariikh ahaan adkeeyay qorshaynta gaadhitaanka sii socda ee bulshooyinka ugu adag in la gaadho.",
      ],
    },
    ar: {
      title: "حملة تطعيم عالمية توسّع نطاقها لتصل مجتمعات يصعب الوصول إليها في القرن الأفريقي",
      excerpt:
        "وسّعت مبادرة صحية دولية تغطية التطعيم الروتيني للأطفال إلى مقاطعات نائية ومتأثرة بالصراع، مستخدمة فرقاً متنقلة للوصول إلى مجتمعات ظلت طويلاً خارج نطاق العيادات الثابتة.",
      body: [
        "وسّعت مبادرة صحية دولية تغطية التطعيم الروتيني للأطفال لتشمل مقاطعات نائية ومتأثرة بالصراع في أنحاء القرن الأفريقي، ناشرةً فرق تطعيم متنقلة للوصول إلى مجتمعات ظلت طويلاً خارج نطاق العيادات الصحية الثابتة. ويصف منسقو البرنامج النموذج المتنقل بأنه ضروري في منطقة تركت فيها الظروف الأمنية والمسافات الشاسعة تاريخياً فجوات في التحصين.",
        "ويقول مسؤولون صحيون إن التوسع في الوصول أنتج بالفعل مكاسب قابلة للقياس في معدلات تغطية الحصبة وشلل الأطفال وأمراض أخرى يمكن الوقاية منها باللقاح في المقاطعات المستهدفة، رغم تحذيرهم من أن الحفاظ على تغطية متسقة في مناطق تشهد انعدام أمن دوري أو قيود وصول موسمية يبقى تحدياً تشغيلياً مستمراً وليس مشكلة حُلّت نهائياً.",
        "وتعتمد المبادرة بشدة على عاملين صحيين مجتمعيين محليين يسافرون مع الفرق المتنقلة ويحافظون على علاقات مع المجتمعات بين الزيارات، ما يبني ثقة يقول منسقو البرنامج إنها ضرورية للتغلب على التردد تجاه اللقاحات المتجذر في اتصال محدود سابق بالأنظمة الصحية الرسمية. وقد لعب شيوخ المجتمع في عدة مقاطعات دوراً فاعلاً في تشجيع المشاركة.",
        "ولا يزال تمويل التوسع في الوصول مؤمناً جزئياً فقط لما بعد دورة البرنامج الحالية، وحثّ مسؤولون صحيون مانحين دوليين على الالتزام بتمويل متعدد السنوات بدلاً من دورات المنح الأقصر التي جعلت تاريخياً من الصعب التخطيط لتوعية مستدامة تصل إلى أصعب المجتمعات وصولاً.",
      ],
    },
  },

  // ============ INTERNATIONAL 9 ============
  {
    categoryKey: "international",
    en: {
      title: "Regional Refugee Numbers Climb as Sudan Conflict Enters Third Year",
      excerpt:
        "The number of refugees fleeing into neighbouring countries has continued to climb as Sudan's conflict grinds on, straining host communities and humanitarian response capacity across the region.",
      body: [
        "The number of refugees fleeing Sudan into neighbouring countries has continued to climb as the conflict grinds on, straining host community resources and humanitarian response capacity across a region already managing multiple overlapping crises. Aid agencies describe the scale of displacement as among the largest in the world, with millions displaced both within Sudan and across its borders.",
        "Host communities in neighbouring countries, many themselves facing economic pressure and, in some areas, drought conditions, have absorbed large refugee populations with limited additional support relative to need. Local officials in several border regions have described strained water, health and education services as new arrivals settle alongside existing residents.",
        "Humanitarian coordinators say response plans for the crisis remain significantly underfunded relative to identified needs, echoing a broader pattern of funding shortfalls affecting simultaneous emergencies worldwide. Some agencies have been forced to prioritise the most acute needs, including emergency food assistance and shelter, over longer-term integration support.",
        "Regional officials have called for greater international burden-sharing, warning that host countries cannot indefinitely absorb refugee populations of this scale without substantially greater support, and have urged renewed diplomatic efforts toward ending the underlying conflict as the only durable solution to the displacement crisis.",
      ],
    },
    so: {
      title: "Tirada Qaxootiga Gobolku waa Sii Kordhaysaa iyadoo Colaadda Suudaan Gashay Sanadkeeda Saddexaad",
      excerpt:
        "Tirada qaxootiga ka carar-baxaya dalalka deriska ah ayaa sii kordhaysa iyadoo colaadda Suudaan ay sii socoto, taasoo cadaadis ku dartay bulshooyinka martida loo yahay iyo awoodda jawaabta bini'aadantinimo ee gobolka.",
      body: [
        "Tirada qaxootiga ka carar-baxaya Suudaan una socda dalalka deriska ah ayaa sii kordhaysa iyadoo colaadda ay sii socoto, taasoo cadaadis ku dartay kheyraadka bulshada martida loo yahay iyo awoodda jawaabta bini'aadantinimo ee gobol horeba u maareynaya dhowr azaamo isdulsaaran. Hay'adaha gargaarku waxay ku tilmaameen baaxadda barakaca mid ka mid ah kuwa ugu waaweyn adduunka, iyadoo malaayiin qof la barakiciyay gudaha Suudaan iyo xuduudaheeda labadaba.",
        "Bulshooyinka martida loo yahay ee dalalka deriska ah, oo qaarkood la kulma cadaadis dhaqaale iyo, meelaha qaarkood, xaalado abaareed, ayaa qaatay dad qaxooti ah oo tiro badan iyagoo leh taageero dheeraad ah oo xaddidan marka la barbar dhigo baahida. Saraakiisha maxalliga ah ee dhowr gobol oo xuduud ah ayaa sharraxay adeegyada biyaha, caafimaadka iyo waxbarashada oo cidhiidhsan maadaama dadka cusub ay ku dhex degaan dadka hore u degganaa.",
        "Isku-duwayaasha bini'aadantinimadu waxay sheegayaan in qorshayaasha jawaabta azaanku ay weli si aad ah u maalgelin-yar yihiin marka la barbar dhigo baahiyaha la aqoonsaday, taasoo ka celceliso qaab ballaadhan oo maalgelin-yaraantu saameyso xaalado degdeg ah oo isku mar dhaca adduunka oo dhan. Hay'ado qaarkood ayaa lagu qasbay inay mudnaan siiyaan baahiyaha ugu daran, oo ay ku jiraan gargaar cunto degdeg ah iyo hoy, halkii ay ka ahaan lahaayeen taageero isku-dhafid muddo-dheer ah.",
        "Saraakiisha gobolku waxay dalbadeen la-wadaagid culeys caalami oo ballaadhan, iyagoo ka digaya in dalalka martida loo yahay aanay si aan xad lahayn u qaadi karin dad qaxooti ah oo baaxaddan leh iyagoon lahayn taageero aad uga weyn, waxayna ku dhiirrigeliyeen dadaal diblumaasiyadeed oo cusub oo lagu doonayo in la joojiyo colaadda hoosta taal xal ahaan kaliya oo waara ee azaanka barakaca.",
      ],
    },
    ar: {
      title: "أعداد اللاجئين الإقليمية ترتفع مع دخول صراع السودان عامه الثالث",
      excerpt:
        "استمر ارتفاع عدد اللاجئين الفارّين إلى دول مجاورة مع استمرار صراع السودان دون هوادة، ما يضغط على المجتمعات المضيفة وقدرة الاستجابة الإنسانية عبر المنطقة.",
      body: [
        "استمر ارتفاع عدد اللاجئين الفارّين من السودان إلى دول مجاورة مع استمرار الصراع دون هوادة، ما يضغط على موارد المجتمعات المضيفة وقدرة الاستجابة الإنسانية عبر منطقة تدير بالفعل أزمات متعددة متداخلة. وتصف وكالات الإغاثة حجم النزوح بأنه من بين الأكبر في العالم، مع نزوح ملايين داخل السودان وعبر حدوده.",
        "استوعبت مجتمعات مضيفة في دول مجاورة، يواجه كثير منها بنفسه ضغطاً اقتصادياً وفي بعض المناطق ظروف جفاف، أعداداً كبيرة من اللاجئين بدعم إضافي محدود مقارنة بالحاجة. ووصف مسؤولون محليون في عدة مناطق حدودية إجهاداً في خدمات المياه والصحة والتعليم مع استقرار الوافدين الجدد جنباً إلى جنب مع السكان الحاليين.",
        "ويقول منسقو العمل الإنساني إن خطط الاستجابة للأزمة لا تزال ناقصة التمويل بشكل كبير مقارنة بالاحتياجات المحددة، ما يعكس نمطاً أوسع من نقص التمويل يؤثر على طوارئ متزامنة حول العالم. واضطرت بعض الوكالات إلى إعطاء الأولوية لأشد الاحتياجات إلحاحاً، بما في ذلك المساعدة الغذائية الطارئة والمأوى، على حساب دعم الاندماج طويل الأمد.",
        "ودعا مسؤولون إقليميون إلى تقاسم أكبر للعبء الدولي، محذّرين من أن الدول المضيفة لا يمكنها استيعاب أعداد لاجئين بهذا الحجم إلى أجل غير مسمى دون دعم أكبر بكثير، وحثّوا على جهود دبلوماسية متجددة لإنهاء الصراع الكامن باعتباره الحل المستدام الوحيد لأزمة النزوح.",
      ],
    },
  },

  // ============ INTERNATIONAL 10 ============
  {
    categoryKey: "international",
    en: {
      title: "African Continental Free Trade Area Implementation Gathers Pace, Slowly",
      excerpt:
        "Officials report gradual progress in implementing the African Continental Free Trade Area, with tariff reductions advancing in some sectors even as infrastructure and customs harmonisation challenges persist.",
      body: [
        "Officials overseeing implementation of the African Continental Free Trade Area report gradual, if uneven, progress, with tariff reductions advancing in several product categories even as deeper structural challenges around infrastructure, customs harmonisation, and non-tariff barriers continue to slow the agreement's full realisation. The initiative aims to create one of the world's largest single markets by member count.",
        "Trade officials describe the agreement's promise as substantial, potentially boosting intra-African trade significantly by lowering barriers that have historically made it easier for many African economies to trade with partners overseas than with neighbouring countries. Realising that promise, however, depends on addressing practical obstacles that trade agreements alone cannot solve.",
        "Chief among the persistent obstacles are inadequate transport and logistics infrastructure connecting many African markets, inconsistent customs procedures and documentation requirements across borders, and, in some regions, ongoing security concerns that complicate cross-border commerce. Officials say addressing these gaps requires sustained investment well beyond the trade agreement's tariff provisions.",
        "Proponents argue that even gradual progress represents meaningful movement toward a longstanding goal of deeper African economic integration, while cautioning that full realisation of the agreement's potential will likely take years of sustained effort across infrastructure, regulatory harmonisation, and political commitment from member states.",
      ],
    },
    so: {
      title: "Hirgelinta Aaga Ganacsiga Xorta ah ee Qaaradda Afrika oo si Tartiib ah u Sii Socota",
      excerpt:
        "Saraakiishu waxay ka warramaan horumar tartiib ah oo ku yimid hirgelinta Aaga Ganacsiga Xorta ah ee Qaaradda Afrika, iyadoo canshuur-hoosaysiinta ay sii socoto qaybo qaarkood xitaa iyadoo caqabadaha kaabayaasha iyo isku-dhafka kastamku ay sii socdaan.",
      body: [
        "Saraakiisha kormeeraya hirgelinta Aaga Ganacsiga Xorta ah ee Qaaradda Afrika waxay ka warramaan horumar tartiib ah, in kastoo aan sinnayn, iyadoo canshuur-hoosaysiinta ay sii socoto dhowr qayb oo alaab ah xitaa iyadoo caqabado qaab-dhismeed oo qoto dheer oo ku saabsan kaabayaasha, isku-dhafka kastamku, iyo xayiraadaha aan canshuurta ahayn ay sii wadaan inay gaabiyaan hirgelinta buuxda ee heshiiska. Hindisuhu wuxuu ku talo galay in la abuuro mid ka mid ah suuqyada ugu waaweyn adduunka tirada xubnaha ah.",
        "Saraakiisha ganacsigu waxay ku tilmaamaan balanqaadka heshiiska mid weyn, isagoo suurtogal ka dhigaya in si weyn loo kordhiyo ganacsiga u dhexeeya wadamada Afrika iyadoo hoos loo dhigayo xayiraadaha taariikh ahaan ka dhigay dhaqaalayaal badan oo Afrika ku fudud in ay la ganacsadaan shuraakada dibadda inta ay la ganacsan lahaayeen dalalka deriska ah. Xaqiijinta ballanqaadkaas, si kastaba, waxay ku xiran tahay in la xalliyo caqabado la taaban karo oo heshiisyada ganacsigu keligood xalli karin.",
        "Kuwa ugu waaweyn ee caqabadaha joogtada ah waa kaabayaasha gaadiidka iyo saadka oo aan ku filnayn ee isku xidha suuqyo badan oo Afrikaan ah, geeddi-socodyada kastamka iyo shuruudaha dukumeenti ee aan isku mid ahayn ee xuduudaha, iyo, gobollada qaarkood, welwel amni oo sii socda oo dhibaya ganacsiga xuduudaha dhaafa. Saraakiishu waxay sheegeen in xallinta farqiyadan ay u baahan tahay maalgelin joogto ah oo aad uga sii dheer qodobbada canshuureed ee heshiiska ganacsiga.",
        "Taageerayaashu waxay ku dooda in horumarka tartiib ah xitaa uu matalayo dhaqdhaqaaq macno leh oo lagu wado yool muddo dheer socday oo ah isku-dhafka dhaqaale ee Afrika ee qoto dheer, iyagoo digaya in xaqiijinta buuxda ee suurtogalnimada heshiisku ay u badan tahay inay qaadato sanado dadaal ah oo joogto ah oo ku saabsan kaabayaasha, isku-dhafka xayndaabinta, iyo ballanqaadka siyaasadeed ee dowladaha xubnaha ka ah.",
      ],
    },
    ar: {
      title: "تنفيذ منطقة التجارة الحرة القارية الأفريقية يكتسب زخماً، ببطء",
      excerpt:
        "يفيد مسؤولون بتقدم تدريجي في تنفيذ منطقة التجارة الحرة القارية الأفريقية، مع تقدم في خفض التعريفات في بعض القطاعات حتى مع استمرار تحديات البنية التحتية وتنسيق الجمارك.",
      body: [
        "يفيد مسؤولون يشرفون على تنفيذ منطقة التجارة الحرة القارية الأفريقية بتقدم تدريجي، وإن كان متفاوتاً، مع تقدم في خفض التعريفات في عدة فئات منتجات حتى مع استمرار تحديات بنيوية أعمق حول البنية التحتية وتنسيق الجمارك والحواجز غير الجمركية في إبطاء التحقيق الكامل للاتفاقية. وتهدف المبادرة إلى خلق واحدة من أكبر الأسواق الموحدة في العالم من حيث عدد الأعضاء.",
        "ويصف مسؤولو التجارة وعد الاتفاقية بأنه كبير، إذ يمكن أن يعزز التجارة البينية الأفريقية بشكل كبير عبر خفض حواجز جعلت تاريخياً من الأسهل على اقتصادات أفريقية كثيرة التجارة مع شركاء في الخارج مقارنة بدول الجوار. لكن تحقيق ذلك الوعد يعتمد على معالجة عقبات عملية لا يمكن لاتفاقيات التجارة وحدها حلها.",
        "ومن أبرز العقبات المستمرة قصور البنية التحتية للنقل واللوجستيات التي تربط أسواقاً أفريقية كثيرة، وتفاوت إجراءات الجمارك ومتطلبات التوثيق عبر الحدود، وفي بعض المناطق، مخاوف أمنية مستمرة تعقّد التجارة العابرة للحدود. ويقول مسؤولون إن معالجة هذه الفجوات تتطلب استثماراً مستداماً يتجاوز بكثير أحكام التعريفات في اتفاقية التجارة.",
        "ويجادل مؤيدون بأن حتى التقدم التدريجي يمثل تحركاً ذا معنى نحو هدف قديم للتكامل الاقتصادي الأفريقي الأعمق، محذّرين من أن التحقيق الكامل لإمكانات الاتفاقية سيستغرق على الأرجح سنوات من الجهد المستمر عبر البنية التحتية وتنسيق التنظيم والالتزام السياسي من الدول الأعضاء.",
      ],
    },
  },

  // ============ INTERNATIONAL 11 ============
  {
    categoryKey: "international",
    en: {
      title: "Climate Summit Outcomes Draw Mixed Reaction From Drought-Vulnerable Nations",
      excerpt:
        "Delegates from climate-vulnerable Horn of Africa nations expressed cautious disappointment at the outcomes of the latest global climate summit, saying adaptation finance commitments fell short of what frontline communities need.",
      body: [
        "Delegates from climate-vulnerable Horn of Africa nations expressed cautious disappointment at the outcomes of the latest global climate summit, saying adaptation finance commitments agreed at the gathering fell short of what communities on the front lines of climate change say they urgently need. Negotiators from the region had entered the talks pressing for a substantial increase in dedicated adaptation funding.",
        "The final agreement included incremental increases in climate finance pledges alongside language reaffirming commitments made at previous summits, but delegates from vulnerable nations said the gap between pledged and delivered funding from prior agreements has eroded trust in new commitments. Several negotiators noted that promised funds from earlier summits remain only partially disbursed.",
        "For Horn of Africa nations experiencing recurring drought, flooding and displacement linked to shifting weather patterns, delegates argued that the summit's outcomes, while representing incremental progress, fall well short of matching the scale and urgency of climate impacts already being felt on the ground, rather than projected for a distant future.",
        "Civil society observers from the region have called for greater accountability mechanisms to track whether pledged funds actually reach affected communities, arguing that summit outcomes are ultimately measured not by the ambition of statements but by resources that materialise where they are needed most.",
      ],
    },
    so: {
      title: "Natiijooyinka Shirweynaha Cimilada oo Kicisay Falcelin Isku Dhafan oo ka Yimid Dalalka Abaarta u Nugul",
      excerpt:
        "Wafuudka ka socda dalalka Geeska Afrika ee cimilo ahaan u nugul ayaa muujiyay niyad-jab taxaddar leh oo ku saabsan natiijooyinka shirweynihii ugu dambeeyay ee cimilada caalamiga ah, iyagoo sheegay in ballanqaadyada maalgelinta la-qabsiga ay ka gaabsadeen waxa bulshooyinka hore u baahan yihiin.",
      body: [
        "Wafuudka ka socda dalalka Geeska Afrika ee cimilo ahaan u nugul ayaa muujiyay niyad-jab taxaddar leh oo ku saabsan natiijooyinka shirweynihii ugu dambeeyay ee cimilada caalamiga ah, iyagoo sheegay in ballanqaadyada maalgelinta la-qabsiga ee lagu heshiiyay kulanka ay ka gaabsadeen waxa bulshooyinka jira safka hore ee isbeddelka cimilada ay sheegayaan inay si degdeg ah u baahan yihiin. Wadahadalayaasha gobolka ayaa u galay wadahadallada iyagoo ku adkeysanaya kororka la taaban karo ee maalgelinta la-qabsiga oo gaar ah.",
        "Heshiiskii ugu dambeeyay wuxuu ka koobnaa kororro tartiib ah oo ballanqaadyada maalgelinta cimilada ah oo ay weheliso qoraal ku xaqiijinaya ballanqaadyadii shirweynayaashii hore, laakiin wafuudka ka socda dalalka nugul ayaa sheegay in farqiga u dhexeeya maalgelinta la ballanqaaday iyo tan dhab ahaan la bixiyay ee heshiisyadii hore uu daciifiyay kalsoonida ballanqaadyada cusub. Dhowr wadahadale ayaa xusay in lacagihii la ballanqaaday shirweynayaashii hore ay wali qayb ahaan la bixiyay.",
        "Dalalka Geeska Afrika ee la kulma abaaraha soo noqnoqda, daadadka iyo barakaca la xidhiidha isbeddelka qaababka cimilada, wafuuddu waxay ku doodeen in natiijooyinka shirweynaha, in kastoo ay matalayaan horumar tartiib ah, ay si aad ah uga gaabsadeen inay la jaanqaadaan baaxadda iyo degdegga saameynta cimilada ee horeba dhulka ka jirta, halkii ay ka ahaan lahayd mustaqbal fog oo la saadaaliyay.",
        "Kormeerayaasha bulshada rayidka ah ee gobolku waxay dalbadeen hab-maamuus xisaabtan oo sii kordhaya oo la socda haddii lacagaha la ballanqaaday ay dhab ahaan gaadhaan bulshooyinka saameeya, iyagoo ku dooda in natiijooyinka shirweynaha ay ugu dambeyntii lagu qiyaaso ma aha hammiga bayaannada laakiin kheyraadka dhab ahaan ka soo baxa meesha ugu badan loo baahan yahay.",
      ],
    },
    ar: {
      title: "نتائج قمة المناخ تلقى ردود فعل متباينة من دول ضعيفة أمام الجفاف",
      excerpt:
        "أعرب مندوبون من دول القرن الأفريقي الضعيفة مناخياً عن خيبة أمل حذرة إزاء نتائج قمة المناخ العالمية الأخيرة، قائلين إن التزامات تمويل التكيّف قصّرت عمّا تحتاجه المجتمعات في الخطوط الأمامية بشكل عاجل.",
      body: [
        "أعرب مندوبون من دول القرن الأفريقي الضعيفة مناخياً عن خيبة أمل حذرة إزاء نتائج قمة المناخ العالمية الأخيرة، قائلين إن التزامات تمويل التكيّف المتفق عليها في القمة قصّرت عمّا تقول مجتمعات في الخطوط الأمامية لتغير المناخ إنها تحتاجه بشكل عاجل. ودخل مفاوضون من المنطقة المحادثات مطالبين بزيادة كبيرة في تمويل التكيّف المخصص.",
        "وتضمن الاتفاق النهائي زيادات تدريجية في تعهدات تمويل المناخ إلى جانب لغة تعيد تأكيد التزامات قُطعت في قمم سابقة، لكن مندوبين من دول ضعيفة قالوا إن الفجوة بين التمويل المتعهَّد به والمُنجز فعلياً من اتفاقيات سابقة قوّضت الثقة بالالتزامات الجديدة. وأشار عدة مفاوضين إلى أن أموالاً وُعد بها في قمم سابقة لا تزال مصروفة جزئياً فقط.",
        "وبالنسبة لدول القرن الأفريقي التي تشهد جفافاً وفيضانات ونزوحاً متكرراً مرتبطاً بتغير أنماط الطقس، جادل مندوبون بأن نتائج القمة، رغم تمثيلها تقدماً تدريجياً، تقصّر كثيراً عن مواكبة حجم وإلحاح تأثيرات المناخ المحسوسة بالفعل على الأرض، لا المتوقعة لمستقبل بعيد.",
        "ودعا مراقبون من المجتمع المدني في المنطقة إلى آليات مساءلة أكبر لتتبع ما إذا كانت الأموال المتعهَّد بها تصل فعلياً إلى المجتمعات المتضررة، مجادلين بأن نتائج القمم تُقاس في النهاية ليس بطموح البيانات بل بالموارد التي تتجسد أينما احتيج إليها أكثر.",
      ],
    },
  },

  // ============ INTERNATIONAL 12 ============
  {
    categoryKey: "international",
    en: {
      title: "International Court Ruling on Maritime Boundary Dispute Reverberates Across Region",
      excerpt:
        "A ruling from an international tribunal on a long-running maritime boundary dispute between two regional states is being closely studied by other Horn of Africa nations with unresolved boundary questions of their own.",
      body: [
        "A ruling from an international tribunal resolving a long-running maritime boundary dispute between two regional states is being closely studied by other Horn of Africa and East African nations that have unresolved maritime or land boundary questions of their own, according to legal analysts tracking the case's implications. The ruling addressed competing claims over waters believed to hold valuable fishing grounds and potential offshore resources.",
        "Legal experts note that while the tribunal's decision is binding on the parties directly involved, its reasoning on how to weigh historical usage, geographic proximity and prior agreements against strict legal boundary principles is likely to influence how similar disputes elsewhere in the region are eventually argued and resolved, whether through litigation or negotiation.",
        "Reaction from the losing party in the case has been measured, with officials indicating they would respect the ruling despite disagreement with aspects of the tribunal's reasoning, a response regional diplomats welcomed as reinforcing the broader principle of resolving territorial disputes through legal mechanisms rather than unilateral action or force.",
        "Analysts caution that legal rulings, while important, do not always translate smoothly into practical implementation, particularly in maritime contexts requiring coordinated enforcement, resource-sharing arrangements, and often years of follow-up technical work to fully operationalise a tribunal's decision on the water.",
      ],
    },
    so: {
      title: "Xukunka Maxkamadda Caalamiga ah ee Khilaafka Xuduudaha Badda oo Dhawaaqa Gobolka Fidiyay",
      excerpt:
        "Xukun ka yimid maxkamad caalami ah oo ku saabsan khilaaf muddo dheer socday oo xuduudaha badda ah oo u dhexeeya laba dowladood oo gobolka ah ayaa si dhow u baadhaya dalal kale oo Geeska Afrika ah oo leh su'aalo xuduud oo isla iyaga u gaar ah.",
      body: [
        "Xukun ka yimid maxkamad caalami ah oo xallisay khilaaf muddo dheer socday oo xuduudaha badda ah oo u dhexeeya laba dowladood oo gobolka ah ayaa si dhow u baadhaya dalal kale oo Geeska Afrika iyo Bariga Afrika ah oo leh su'aalo xuduud badeed ama dhul oo isla iyaga u gaar ah oo aan la xallin, sida ay sheegeen falanqeeyayaal sharci oo la socda saameynta kiiska. Xukunku wuxuu wax ka qabtay sheegashooyin iska soo horjeeda oo ku saabsan biyo la rumeysan yahay inay hayaan meelo kalluumeysi qiimo leh iyo kheyraad xeeb-dhow oo suurtogal ah.",
        "Khubarada sharciyaduhu waxay xusuu in xukunka maxkamadu, in kastoo uu ku xiran yahay dhinacyada si toos ah ugu lug leh, sababaha uu ku saleynayo sida loo miisaamo isticmaalka taariikhiga ah, dhow-dhowaanshaha juqraafiyeed iyo heshiisyada hore marka la barbar dhigo mabaadi'da xuduudaha sharciga ah ee adag ay u badan tahay inay saameyn ku yeeshaan sida khilaafyo la mid ah oo meelo kale oo gobolka ah ay ugu dambeyntii u doodi doonaan una xalliyi doonaan, hadday tahay dacwad ama wadahadal.",
        "Falcelinta dhinaca guuldarreystay ee kiiska ayaa ahayd mid la miisaamay, iyadoo saraakiishu ay tilmaameen inay ixtiraami doonaan xukunka in kastoo aysan ku raacsanayn dhinacyo ka mid ah sababaha uu maxkamadu ku saleystay, jawaab diblumaasiyiinta gobolku ay soo dhaweeyeen iyadoo xoojinaysa mabda'a ballaadhan ee xallinta khilaafyada dhulka iyadoo la maro qaababka sharciga ah halkii laga isticmaali lahaa ficil hal-dhinac ah ama xoog.",
        "Falanqeeyayaashu waxay ka digayaan in xukummada sharciga, in kastoo ay muhiim yihiin, aysan mar walba si sahlan ugu beddelmin hirgelin dhab ah, gaar ahaan xaaladaha badeed ee u baahan fulin isku-duwan, heshiisyo wadaag kheyraad, iyo inta badan sanado shaqo raad-raac oo farsamo ah si loogu buuxiyo hirgelinta xukunka maxkamadda ee biyaha.",
      ],
    },
    ar: {
      title: "حكم محكمة دولية بشأن نزاع حدود بحرية يتردد صداه في المنطقة",
      excerpt:
        "تدرس دول أخرى في القرن الأفريقي لديها مسائل حدودية لم تُحل حكماً صادراً عن محكمة دولية بشأن نزاع حدود بحرية طويل الأمد بين دولتين إقليميتين عن كثب.",
      body: [
        "يدرس محللون قانونيون عن كثب حكماً صادراً عن محكمة دولية حسم نزاعاً طويل الأمد بشأن الحدود البحرية بين دولتين إقليميتين، إذ تتابعه دول أخرى في القرن الأفريقي وشرق أفريقيا لديها مسائل حدودية بحرية أو برية لم تُحل خاصة بها، بحسب محللين قانونيين يتتبعون تداعيات القضية. وتناول الحكم مطالبات متنافسة على مياه يُعتقد أنها تحوي مناطق صيد قيّمة وموارد محتملة قبالة الساحل.",
        "ويشير خبراء قانونيون إلى أنه رغم أن قرار المحكمة ملزم للأطراف المعنية مباشرة، فإن منطقه في كيفية موازنة الاستخدام التاريخي والقرب الجغرافي والاتفاقيات السابقة مقابل مبادئ الحدود القانونية الصارمة يُرجّح أن يؤثر على كيفية تقديم الحجج وحل نزاعات مماثلة في أماكن أخرى من المنطقة في النهاية، سواء عبر التقاضي أو التفاوض.",
        "وكان رد فعل الطرف الخاسر في القضية متزناً، إذ أشار مسؤولون إلى أنهم سيحترمون الحكم رغم اختلافهم مع جوانب من منطق المحكمة، وهو رد رحّب به دبلوماسيون إقليميون باعتباره يعزز المبدأ الأوسع لحل النزاعات الإقليمية عبر الآليات القانونية بدلاً من العمل الأحادي أو القوة.",
        "ويحذّر محللون من أن الأحكام القانونية، رغم أهميتها، لا تُترجم دائماً بسلاسة إلى تنفيذ عملي، خصوصاً في سياقات بحرية تتطلب إنفاذاً منسقاً وترتيبات تقاسم موارد وغالباً سنوات من العمل التقني اللاحق لتفعيل قرار المحكمة على المياه بالكامل.",
      ],
    },
  },
];

// ---------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------

async function wipe() {
  await prisma.articleTag.deleteMany();
  await prisma.article.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.media.deleteMany();
  console.log("  cleared articles / categories / tags / media");
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@newsroom.com").toLowerCase();
  const plain = process.env.ADMIN_PASSWORD ?? "Admin123!";
  const passwordHash = await bcrypt.hash(plain, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN, passwordHash, isActive: true },
    create: {
      email,
      name: "Site Administrator",
      authorSlug: "admin",
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
      emailVerified: new Date(),
      bio: "Administrator account.",
    },
  });
  console.log(`  admin: ${email}  (password: ${plain})`);
  return admin.id;
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

/** Build one locale's translation payload for a source article. */
function buildTranslation(
  locale: Locale,
  content: LocalizedContent,
  baseSlug: string,
) {
  const contentText = content.body.join("\n\n");
  return {
    locale,
    title: content.title,
    slug: baseSlug,
    excerpt: content.excerpt,
    content: tiptapDoc(content.body),
    contentText,
    readingTime: readingTime(contentText),
  };
}

async function seedArticles(
  authorIds: Record<string, string>,
  categoryIds: Record<string, string>,
) {
  const emails = AUTHORS.map((a) => a.email);
  const now = Date.now();
  let n = 0;

  // 48 distinct source articles, one row each — no copy-looping.
  for (const article of ARTICLES) {
    const baseSlugEn = slugify(article.en.title);
    const baseSlugSo = slugify(article.so.title);
    const baseSlugAr = `article-ar-${slugify(article.en.title)}`; // ar titles have no latin chars → derive from en

    const publishedAt = new Date(now - n * 6 * 3_600_000); // ~6h apart
    const status =
      n % 13 === 5
        ? ArticleStatus.DRAFT
        : n % 17 === 7
          ? ArticleStatus.SCHEDULED
          : ArticleStatus.PUBLISHED;

    const authorEmail = pick(emails);
    const authorId = authorIds[authorEmail];

    // 1. Create the Media row FIRST — coverImageId below depends on
    //    cover.id. Never use a nested `coverImage: { create: ... }`;
    //    this schema requires the Media row to exist independently.
    const cover = await prisma.media.create({
      data: {
        uploaderId: authorId,
        storageKey: `seed/${article.categoryKey}-${n}-${baseSlugEn}`,
        url: pick(UNSPLASH),
        mimeType: "image/jpeg",
        sizeBytes: 500_000,
        width: 1200,
        height: 750,
        altText: article.en.title,
        processed: true,
      },
    });

    // 2. Create the Article, passing coverImageId — not a nested create.
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
        authorId,
        categoryId: categoryIds[article.categoryKey],
        coverImageId: cover.id,
        translations: {
          create: [
            buildTranslation(Locale.en, article.en, baseSlugEn),
            buildTranslation(Locale.so, article.so, baseSlugSo),
            buildTranslation(Locale.ar, article.ar, baseSlugAr),
          ],
        },
      },
    });
    n++;
  }
  console.log(`  articles: ${n} created (48 distinct sources, 12 per category)`);
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------

async function main() {
  console.log("Seeding…");
  await wipe();
  await seedAdmin();
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
