/**
 * Database seed — real Somalia news, fully trilingual, 25 articles.
 *
 * 9 hand-written articles (3 per category) each with complete
 * English, Somali, and Arabic headline + excerpt + BODY. Every
 * article is looped 10x (→ 90 total) with an index suffix on the
 * slug (and, for copies after the first, on the title) so the
 * (slug, locale) unique constraint never collides.
 *
 * Matches the Phase 1 hub-and-translation schema. contentText is
 * populated per locale for the tsvector trigger. Unsplash covers,
 * staggered publish dates, 3 authors, mostly PUBLISHED.
 *
 * Run:  npx prisma db seed
 * (package.json → "prisma": { "seed": "tsx prisma/seed.ts" })
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
    .replace(/[\u0300-\u036f]/g, "")
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
].map((id) => `https://images.unsplash.com/${id}?w=1200&q=80`);

// ---------------------------------------------------------------
// Categories & authors
// ---------------------------------------------------------------

const CATEGORIES = [
  { key: "politics", en: "Politics", so: "Siyaasadda", ar: "السياسة", slugSo: "siyaasadda", slugAr: "alsiyasa" },
  { key: "technology", en: "Technology", so: "Teknoolajiyada", ar: "التكنولوجيا", slugSo: "teknoolajiyada", slugAr: "altiknulujia" },
  { key: "local-news", en: "Local News", so: "Wararka Deegaanka", ar: "الأخبار المحلية", slugSo: "wararka-deegaanka", slugAr: "alakhbar-almahalia" },
];

const AUTHORS = [
  { email: "amina@newsroom.test", name: "Amina Yusuf", slug: "amina-yusuf", role: Role.ADMIN },
  { email: "omar@newsroom.test", name: "Omar Hassan", slug: "omar-hassan", role: Role.EDITOR },
  { email: "layla@newsroom.test", name: "Layla Ahmed", slug: "layla-ahmed", role: Role.AUTHOR },
];

// ---------------------------------------------------------------
// The 9 source articles (fully trilingual)
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
        "At the heart of the dispute are competing visions for how Somalia should vote. The Future Council — a coalition that includes the Puntland and Jubaland administrations alongside other opposition figures — has put forward a transitional direct-elections framework, while a separate bloc led by former Prime Minister Omar Abdirashid Ali Sharmarke has proposed a one-person, one-vote system built around an independent federal electoral commission, a multiparty structure, and a mandatory 30 percent quota for women in parliament.",
        "President Hassan Sheikh Mohamud has pressed for universal suffrage to replace the decades-old clan-based model, but the push has deepened mistrust with Puntland and Jubaland, both of which have rejected the constitutional changes as rushed and insufficiently consultative. The two states declined to join earlier Turkey-hosted sessions, questioning the neutrality of the mediation.",
        "The stakes are considerable. Earlier rounds have collapsed into recrimination, and violent clashes in Mogadishu in June left at least 13 people dead. While officials on both sides have spoken of a more positive atmosphere in recent meetings, a comprehensive breakthrough remains elusive, and the electoral timetable published by the national commission has itself become a point of contention.",
      ],
    },
    so: {
      title: "Dowladda Soomaaliya iyo Mucaaradka oo Soo Bandhigay Qaabab Kala Duwan oo Doorasho, Wadahadalladuna Gaadhaan Marxalad Muhiim ah",
      excerpt:
        "Wadahadallada u dhexeeya Dowladda Federaalka iyo Golaha Mustaqbalka ee mucaaradku waxay gaadheen marxalad go'aan ah magaalada Muqdisho, iyadoo dhinacyadu soo bandhigeen qorshayaal iska horimaad ah oo doorasho toos ah.",
      body: [
        "Wadahadallada siyaasadeed ee u dhexeeya Dowladda Federaalka Soomaaliya iyo kooxaha mucaaradka ayaa bishan gaadhay marxalad aad muhiim u ah magaalada Muqdisho, iyadoo doodaha lagu diirad saarayo sida looga bixi lahaa istaagga muddada dheer socday ee ku saabsan qaabka doorashada dalka. Kalfadhiyada, oo ay fududaysay Howlgalka Kaalmaynta Kala-guurka ee Qaramada Midoobay u qaabilsan Soomaaliya, waxaa ka soo qaybgalay wakiillo ka socda safaaradaha Turkiga, Maraykanka, Ingiriiska iyo Midowga Yurub, taasoo muujinaysa muhiimadda ay shurakada caalamigu siiyaan xal wadahadal.",
        "Xudunta khilaafka waxaa ah aragtiyo iska soo horjeeda oo ku saabsan sida Soomaaliya u codayn lahayd. Golaha Mustaqbalka — oo ah isbahaysi ay ku jiraan maamullada Puntland iyo Jubbaland oo ay weheliyaan shakhsiyaad kale oo mucaarad ah — waxa uu soo bandhigay qaab-dhismeed doorasho-toos ah oo kala-guur ah, halka kooxo kale oo uu hoggaamiyo Ra'iisul-wasaarihii hore Cumar Cabdirashiid Cali Sharmaarke ay soo jeediyeen nidaam qof-kii-cod-keliya oo ku dhisan guddi doorasho oo federaal ah oo madax-bannaan, qaab xisbi-badan, iyo saami boqolkiiba 30 oo qasab ah oo dumarku ka helaan baarlamaanka.",
        "Madaxweyne Xasan Sheekh Maxamuud ayaa ku adkaystay in cod-bixin guud lagu beddelo nidaamkii qabaa'ilka ee tobannaan sano jiray, laakiin dadaalkaasi wuxuu sii kordhiyay kalsooni-darrada u dhaxaysa Puntland iyo Jubbaland, kuwaas oo labaduba diiday isbeddellada dastuuriga ah iyagoo ku tilmaamay kuwo degdeg ah oo aan si ku filan looga wada tashan. Labada dowlad-goboleed waxay diideen inay ka soo qaybgalaan kalfadhiyadii hore ee Turkigu martigeliyay, iyagoo su'aal ka keenay dhexdhexaadnimada dhexdhexaadinta.",
        "Halista waa mid weyn. Wareegyadii hore waxay ku dhammaadeen isku eedayn, iyadoo iskahorimaadyo rabshado wata oo Muqdisho ka dhacay bishii Juun ay ku dhinteen ugu yaraan 13 qof. In kasta oo saraakiisha labada dhinacba ay ka hadleen jawi ka wanaagsan kulannadii dhawaa, haddana horumar dhammaystiran wali lama gaadhin, jadwalka doorashada ee ay soo saartay guddida qaranku isaga ayaa noqday barta muran.",
      ],
    },
    ar: {
      title: "الحكومة الصومالية والمعارضة تطرحان نماذج انتخابية متنافسة مع دخول المحادثات مرحلة حاسمة",
      excerpt:
        "دخلت المفاوضات بين الحكومة الاتحادية ومجلس المستقبل المعارض مرحلة حاسمة في مقديشو، حيث طرح كل طرف تصوراً منافساً لانتخابات مباشرة.",
      body: [
        "دخلت المحادثات السياسية بين الحكومة الاتحادية الصومالية وجماعات المعارضة مرحلة أكثر حسماً في مقديشو هذا الشهر، مع تركيز النقاشات على كيفية كسر الجمود المستمر منذ فترة طويلة حول النموذج الانتخابي للبلاد. وحضر الجلسات، التي يسّرتها بعثة الأمم المتحدة لتقديم المساعدة الانتقالية في الصومال، ممثلون عن البعثات التركية والأمريكية والبريطانية والاتحاد الأوروبي، مما يؤكد الأهمية التي يوليها الشركاء الدوليون للتوصل إلى تسوية تفاوضية.",
        "يكمن جوهر الخلاف في رؤى متنافسة لكيفية إجراء الانتخابات في الصومال. فقد طرح مجلس المستقبل — وهو تحالف يضم إدارتَي بونتلاند وجوبالاند إلى جانب شخصيات معارضة أخرى — إطاراً انتقالياً للانتخابات المباشرة، بينما اقترحت كتلة منفصلة يقودها رئيس الوزراء الأسبق عمر عبد الرشيد علي شارماركي نظام صوت واحد لكل شخص يقوم على لجنة انتخابية اتحادية مستقلة، وبنية متعددة الأحزاب، وحصة إلزامية للنساء في البرلمان تبلغ 30 في المئة.",
        "وقد ضغط الرئيس حسن شيخ محمود من أجل الاقتراع العام ليحل محل النموذج القبلي القائم منذ عقود، لكن هذا الدفع عمّق انعدام الثقة مع بونتلاند وجوبالاند، اللتين رفضتا التعديلات الدستورية باعتبارها متسرعة وغير قائمة على تشاور كافٍ. وامتنعت الولايتان عن الانضمام إلى الجلسات السابقة التي استضافتها تركيا، متشككتين في حياد الوساطة.",
        "والمخاطر كبيرة. فقد انهارت الجولات السابقة وسط تبادل الاتهامات، وأسفرت اشتباكات عنيفة في مقديشو في يونيو عن مقتل 13 شخصاً على الأقل. ورغم حديث المسؤولين من الجانبين عن أجواء أكثر إيجابية في الاجتماعات الأخيرة، فإن اختراقاً شاملاً لا يزال بعيد المنال، بل إن الجدول الزمني الانتخابي الذي نشرته اللجنة الوطنية أصبح هو نفسه نقطة خلاف.",
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
        "The African Union Support and Stabilisation Mission in Somalia, known as AUSSOM, is confronting a deepening financial crisis that African Union officials say could imperil its operations as early as next year. The mission, which comprises more than 12,500 personnel and formally began work at the start of 2025, depends heavily on international support to sustain both its logistics and its counterinsurgency role alongside Somali forces.",
        "The uncertainty intensified after the United States informed the African Union that it would not finance UNSOS — the United Nations logistical backbone supporting the mission — beyond the end of 2026, and signalled it would oppose efforts in the Security Council to extend that funding. Washington has tied its position to demands that Somalia's leadership end its political infighting and cooperate more closely on governance and security.",
        "At an emergency meeting of the AU Peace and Security Council, member states openly questioned how long the continent could sustain such a costly operation. A UN official acknowledged that the approved UNSOS budget still required full financing, while analysts warned that without an alternative donor to bridge the gap, the mission could face operational collapse heading into 2027.",
        "The debate arrives at a fragile moment. AUSSOM remains central to holding the line against Al-Shabaab, and any abrupt drawdown risks ceding hard-won ground at a time when Somalia's federal politics are strained and its security transition is far from complete.",
      ],
    },
    so: {
      title: "Midowga Afrika oo Ka Fikiraya Mustaqbalka Howlgalka Nabad-ilaalinta Soomaaliya iyadoo Dhibaatada Maalgelintu Sii Xumaanayso",
      excerpt:
        "Yaraansho ballaadhan oo ku yimid maalgelinta caalamiga ah ayaa shaki gelisay mustaqbalka howlgalka xasillinta ee Midowga Afrika ee Soomaaliya, iyadoo saraakiishu ka digeen burbur suurtogal ah 2027.",
      body: [
        "Howlgalka Midowga Afrika ee Taageerada iyo Xasillinta Soomaaliya, oo loo yaqaan AUSSOM, ayaa wajahaya dhibaato maaliyadeed oo sii xumaanaysa oo saraakiisha Midowga Afrika ay sheegeen inay khatar gelin karto hawlgalladiisa xitaa sanadka soo socda. Howlgalka, oo ka kooban in ka badan 8,500 oo shaqaale oo si rasmi ah u bilaabay shaqada bilowgii 2025, wuxuu si weyn ugu tiirsan yahay taageerada caalamiga ah si uu u sii wado saadka iyo doorkiisa la dagaallanka fallaagada oo uu la kaashado ciidamada Soomaaliya.",
        "Hubanti-la'aantu waxay sii kordhay ka dib markii Maraykanku u sheegay Midowga Afrika inuusan maalgelin doonin UNSOS — oo ah tiirka saadka ee Qaramada Midoobay ee taageera howlgalka — wixii ka dambeeya dhammaadka 2026, wuxuuna muujiyay inuu ka soo horjeedi doono dadaallada Golaha Ammaanka ee lagu kordhinayo maalgelintaas. Washington waxay xidhiidhisay mawqifkeeda dalabyo ah in hoggaanka Soomaaliya uu joojiyo isqabqabsiga siyaasadeed oo uu si dhow ula shaqeeyo maamulka iyo amniga.",
        "Kulan degdeg ah oo uu yeeshay Golaha Nabadda iyo Ammaanka ee Midowga Afrika, dowladaha xubnaha ka ah waxay si furan u su'aaleen muddada ay qaaraddu sii wadi karto howlgal sidan u qaali ah. Sarkaal ka tirsan Qaramada Midoobay ayaa qiray in miisaaniyadda UNSOS ee la ansixiyay ay wali u baahan tahay maalgelin buuxda, halka falanqeeyayaashu ay ka digeen in la'aanta deeq-bixiye kale oo buuxiya farqiga, howlgalku uu la kulmi karo burbur hawleed markii uu galo 2027.",
        "Dooddu waxay imanaysaa xilli jilicsan. AUSSOM waxay wali udub-dhexaad u tahay adkaynta xadka ka dhanka ah Al-Shabaab, oo ka-bixid kasta oo degdeg ah waxay khatar gelinaysaa dhul si adag loo helay xilli ay siyaasadda federaalka Soomaaliya cakiran tahay oo kala-guurka amnigeedu uu ka fog yahay dhammaystir.",
      ],
    },
    ar: {
      title: "الاتحاد الأفريقي يبحث مستقبل بعثة السلام في الصومال مع تفاقم أزمة التمويل",
      excerpt:
        "ألقى عجز متزايد في التمويل الدولي بظلال من الشك على مستقبل بعثة الاستقرار التابعة للاتحاد الأفريقي في الصومال، مع تحذير المسؤولين من انهيار محتمل في 2027.",
      body: [
        "تواجه بعثة الاتحاد الأفريقي للدعم والاستقرار في الصومال، المعروفة باسم أوسوم، أزمة مالية متفاقمة يقول مسؤولو الاتحاد الأفريقي إنها قد تهدد عملياتها في وقت مبكر قد يكون العام المقبل. وتعتمد البعثة، التي تضم أكثر من 12,500 فرد وبدأت عملها رسمياً مطلع عام 2025، اعتماداً كبيراً على الدعم الدولي للحفاظ على لوجستياتها ودورها في مكافحة التمرد إلى جانب القوات الصومالية.",
        "وتصاعدت حالة عدم اليقين بعد أن أبلغت الولايات المتحدة الاتحاد الأفريقي بأنها لن تموّل بعثة الأمم المتحدة للدعم اللوجستي، العمود الفقري الداعم للبعثة، بعد نهاية عام 2026، وأشارت إلى أنها ستعارض جهود مجلس الأمن لتمديد ذلك التمويل. وربطت واشنطن موقفها بمطالب بأن تنهي القيادة الصومالية اقتتالها السياسي وأن تتعاون بشكل أوثق في شؤون الحكم والأمن.",
        "وفي اجتماع طارئ لمجلس السلم والأمن التابع للاتحاد الأفريقي، تساءلت الدول الأعضاء علناً عن المدة التي يمكن أن تتحمل فيها القارة عملية بهذه التكلفة. وأقرّ مسؤول أممي بأن ميزانية الدعم اللوجستي المعتمدة لا تزال بحاجة إلى تمويل كامل، بينما حذّر محللون من أنه دون مانح بديل لسد الفجوة، قد تواجه البعثة انهياراً تشغيلياً مع دخول عام 2027.",
        "ويأتي هذا النقاش في لحظة هشة. فلا تزال أوسوم محورية في صد حركة الشباب، وأي انسحاب مفاجئ يهدد بالتخلي عن مكاسب تحققت بشق الأنفس في وقت تعاني فيه السياسة الاتحادية الصومالية من توتر ولا يزال انتقالها الأمني بعيداً عن الاكتمال.",
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
        "The friction is part of a larger rupture. Puntland and Jubaland have both withdrawn cooperation from key federal processes, objecting to constitutional amendments they say were pushed through without adequate consultation. Both states are members of the opposition Future Council, and their leaders — Said Abdullahi Deni of Puntland and Ahmed Madobe of Jubaland — have repeatedly clashed with President Hassan Sheikh Mohamud over the direction of the political transition.",
        "Former Prime Minister Omar Abdirashid Ali Sharmarke has warned that Somalia risks sliding back into internal conflict as military postures harden and political dialogue falters. Such warnings carry weight in a country where disputes over federalism and power-sharing have repeatedly spilled into violence.",
        "Analysts caution that the standoff in the north-east is symptomatic of a wider structural problem: a federal system whose boundaries of authority remain contested. Until the constitutional questions are resolved, they argue, localised confrontations between federal and regional forces are likely to recur.",
      ],
    },
    so: {
      title: "Ciidamada Puntland iyo kuwa Federaalka oo Isku Haya Eedeymo iyadoo Xiisaddu Sare u Kacayso Waqooyi-bari",
      excerpt:
        "Saraakiisha Puntland ayaa sheegay inay si dhow u dabagalayaan waxay ku tilmaameen dhaqdhaqaaq militari oo ay dowladda federaalku samaynayso, calaamada ugu dambaysay ee xiisadda Muqdisho iyo dowlad-goboleed ka go'ay.",
      body: [
        "Xiriirka u dhexeeya maamulka federaalka Soomaaliya iyo dowlad-goboleedka waqooyi-bari ee Puntland ayaa noqday mid si isa soo taraysa u xiisad badan, iyadoo saraakiisha gobolku ay ku eedaynayaan Muqdisho abaabul militari, waxayna ka digayaan inay si dhow u dabagalayaan horumarrada. Puntland, oo ka mid ah dowlad-goboleedyada ugu xasilloon dalka, ayaa iska fogaysay dowladda federaalka iyadoo ay socoto istaagga dastuuriga ah ee ballaadhan.",
        "Isku-dhaca waa qayb ka mid ah kala-go' weyn. Puntland iyo Jubbaland labaduba waxay ka baxeen iskaashiga geeddi-socodyada federaalka ee muhiimka ah, iyagoo ka soo horjeeda isbeddellada dastuuriga ah ee ay sheegeen in la ansixiyay iyadoon si ku filan looga wada tashan. Labada dowlad-goboleed waa xubno ka tirsan Golaha Mustaqbalka ee mucaaradka, hoggaamiyayaashooda — Siciid Cabdullaahi Deni oo Puntland iyo Axmed Madoobe oo Jubbaland — ayaa marar badan kula dhacay Madaxweyne Xasan Sheekh Maxamuud jihada kala-guurka siyaasadeed.",
        "Ra'iisul-wasaarihii hore Cumar Cabdirashiid Cali Sharmaarke ayaa ka digay in Soomaaliya ay khatar ugu jirto inay dib ugu noqoto colaad gudaha ah iyadoo jaangooyada militari ay sii adkaanayaan wadahadalka siyaasadduna uu liicayo. Digniinaha noocaas ah waxay culays ku leeyihiin dal ay khilaafyada federaalnimada iyo qaybsiga awoodda marar badan ku dhaceen rabshado.",
        "Falanqeeyayaashu waxay ka digayaan in istaagga waqooyi-bari uu calaamad u yahay dhibaato qaab-dhismeed oo ballaadhan: nidaam federaal ah oo xudduudaha awooddiisu ay wali muran yihiin. Ilaa la xalliyo su'aalaha dastuuriga ah, waxay ku doodayaan, iska-horimaadyo maxalli ah oo u dhexeeya ciidamada federaalka iyo kuwa gobolku waxay u badan tahay inay soo noqnoqdaan.",
      ],
    },
    ar: {
      title: "قوات بونتلاند والقوات الاتحادية تتبادلان الاتهامات مع تصاعد التوتر في الشمال الشرقي",
      excerpt:
        "يقول مسؤولون في بونتلاند إنهم يراقبون عن كثب ما يصفونه بمناورات عسكرية للحكومة الاتحادية، في أحدث مؤشر على التوتر بين مقديشو وولاية منشقّة.",
      body: [
        "ازدادت العلاقات توتراً بين السلطات الاتحادية الصومالية وولاية بونتلاند الواقعة في الشمال الشرقي، حيث يتهم مسؤولون إقليميون مقديشو بالتعبئة العسكرية ويحذّرون من أنهم يراقبون التطورات عن كثب. وقد نأت بونتلاند، إحدى أرسخ الولايات الأعضاء في البلاد، بنفسها عن الحكومة الاتحادية وسط المواجهة الدستورية الأوسع.",
        "ويأتي هذا الاحتكاك ضمن قطيعة أكبر. فقد سحبت كل من بونتلاند وجوبالاند تعاونهما من العمليات الاتحادية الرئيسية، اعتراضاً على تعديلات دستورية تقولان إنها مُرّرت دون تشاور كافٍ. والولايتان عضوان في مجلس المستقبل المعارض، وقد اصطدم زعيماهما — سعيد عبد الله دني في بونتلاند وأحمد مادوبي في جوبالاند — مراراً بالرئيس حسن شيخ محمود حول اتجاه الانتقال السياسي.",
        "وحذّر رئيس الوزراء الأسبق عمر عبد الرشيد علي شارماركي من أن الصومال يخاطر بالانزلاق مجدداً إلى صراع داخلي مع تصلّب المواقف العسكرية وتعثّر الحوار السياسي. وتحمل هذه التحذيرات وزناً في بلد انزلقت فيه الخلافات حول الفيدرالية وتقاسم السلطة مراراً إلى العنف.",
        "ويحذّر المحللون من أن المواجهة في الشمال الشرقي عَرَضٌ لمشكلة بنيوية أوسع: نظام اتحادي لا تزال حدود سلطته محل نزاع. وحتى تُحل المسائل الدستورية، كما يرون، فمن المرجح أن تتكرر المواجهات المحلية بين القوات الاتحادية والإقليمية.",
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
        "The challenge for 2026 and beyond is to build durable institutions around that digital foundation. Hormuud has moved to integrate its wallet with commercial banks, allowing customers to shift funds between mobile balances and bank accounts, and Somalia has joined the Pan-African Payment and Settlement System to ease cross-border transactions. Reforms including a national payment switch and a payment-system law aim to knit these pieces into a fully interoperable network.",
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
        "Caqabadda 2026 iyo wixii ka dambeeya waxay tahay in la dhiso hay'ado waara oo ku wareegsan aasaaskaas dhijitaalka ah. Hormuud waxay u dhaqaaqday inay jeebkeeda ku daabusho bangiyada ganacsiga, taasoo u ogolaanaysa macaamiisha inay lacag u wareejiyaan inta u dhaxaysa hadhaaga mobaylka iyo xisaabaadka bangiga, Soomaaliyana waxay ku biirtay Nidaamka Lacag-bixinta iyo Xisaabtanka Afrika oo dhan si loo fududeeyo macaamilada xuduudaha dhaafa. Isbeddellada oo ay ku jiraan beddelaad lacag-bixineed oo qaran iyo sharci nidaam-lacageed waxay doonayaan inay biraha isku xidhaan shabakad si buuxda u wada-shaqaysa.",
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
        "والتحدي في عام 2026 وما بعده هو بناء مؤسسات متينة حول ذلك الأساس الرقمي. فقد تحركت هرمود لدمج محفظتها مع المصارف التجارية، بما يتيح للعملاء نقل الأموال بين أرصدة الهاتف والحسابات المصرفية، وانضم الصومال إلى نظام المدفوعات والتسويات الأفريقي لتسهيل المعاملات العابرة للحدود. وتهدف إصلاحات تشمل محوّل مدفوعات وطنياً وقانوناً لنظام المدفوعات إلى نسج هذه القطع في شبكة قابلة للتشغيل البيني بالكامل.",
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
        "The evidence is accumulating. The nationwide licensing of satellite internet aims to bring connectivity to areas terrestrial networks have never served. On the financial side, Somalia's entry into the Pan-African Payment and Settlement System and a partnership between Hormuud and Germany's development agency to deepen cross-border payment infrastructure — including artificial-intelligence integration — signal an intent to plug the country's mobile-money ecosystem into regional and global rails.",
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
        "Caddaymuhu way isa soo urursanayaan. Shatiyaynta dalka oo dhan ee internetka dayax-gacmeedka waxay ujeeddadeedu tahay inay xiriir keento meelaha aanay shabakadaha dhulku waligood u adeegin. Dhinaca maaliyadeed, ku-biiritaanka Soomaaliya ee Nidaamka Lacag-bixinta iyo Xisaabtanka Afrika oo dhan iyo iskaashi u dhexeeya Hormuud iyo hay'adda horumarinta Jarmalka si loo qoto-dheereeyo kaabayaasha lacag-bixinta xuduudaha dhaafa — oo ay ku jirto isku-darka garaadka macmalka ah — waxay muujinayaan ujeeddo lagu xidhayo habraaca lacagta-mobaylka ee dalka biraha gobolka iyo caalamka.",
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
        "والأدلة تتراكم. فالترخيص الوطني للإنترنت الفضائي يهدف إلى إيصال الاتصال إلى مناطق لم تخدمها الشبكات الأرضية قط. وعلى الصعيد المالي، يشير انضمام الصومال إلى نظام المدفوعات والتسويات الأفريقي، والشراكة بين هرمود ووكالة التنمية الألمانية لتعميق البنية التحتية للمدفوعات العابرة للحدود — بما في ذلك دمج الذكاء الاصطناعي — إلى نية لربط منظومة الأموال عبر الهاتف المحمول في البلاد بالسكك الإقليمية والعالمية.",
        "وهناك تجارب اجتماعية ملموسة أيضاً. فقد بدأت هرمود تمويل هواتف ذكية منخفضة التكلفة للمستخدمين ذوي الدخل المنخفض، لا تتطلب سوى وديعة صغيرة ودون تاريخ ائتماني رسمي، مع بيانات تجريبية مبكرة تُظهر معدلات تعثّر منخفضة. وصُمّمت برامج كهذه لتوسيع مدخل الاقتصاد الرقمي أمام الأسر التي استبعدها التمويل الرسمي تاريخياً.",
        "ولا تخلو الاستراتيجية من مخاطر. ففجوات القدرة على تحمل التكاليف، ونقص العمال المهرة، وهشاشة مؤسسات الدولة، كلها تهدد بإبطاء التقدم، ولا يمكن للتكنولوجيا أن تحل محل الاستقرار السياسي. لكن اتجاه المسار واضح، وقد جعل استعداد الصومال للتحرك أسرع من جيران أوفر موارد منه مثالاً غير متوقع على كيفية تشكّل التنمية الرقمية أولاً في دولة هشة.",
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
      ],
    },
  },

  // ============ LOCAL NEWS 2 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Mogadishu Prepares for District Council and Mayoral Elections",
      excerpt:
        "Local governance elections are scheduled for the Banadir region, with district council polls and the selection of Mogadishu's mayor set to test the country's fraught transition toward direct voting.",
      body: [
        "Authorities have set out a timetable for local governance elections in the Banadir region, with district council polls scheduled and the election of Mogadishu's mayor and deputy mayor to follow. The national electoral commission has said the votes will be conducted in a free, fair and transparent manner in accordance with Somali law, and has called on political stakeholders, government institutions and civil society to cooperate.",
        "The Banadir contests are part of a broader schedule of federal member state and local elections. Officials have framed them as building blocks in Somalia's long-promised shift from an indirect, clan-based system toward direct elections — a transition that has been repeatedly delayed by political disagreement.",
        "The timing is delicate. The commission's release of an electoral timetable has itself proven contentious, arriving amid unresolved negotiations between the federal government and the opposition over the very model under which the country should vote. Critics have warned that publishing dates before a political consensus is reached risks hardening divisions rather than resolving them.",
        "For residents of the capital, the elections carry practical weight beyond the national dispute. District councils and the mayoralty shape the everyday business of the city — services, security and local administration — and a credible, orderly vote in Mogadishu would offer an early signal of whether Somalia's wider electoral ambitions can be realised in practice.",
      ],
    },
    so: {
      title: "Muqdisho oo u Diyaargaroobaysa Doorashada Golayaasha Degmooyinka iyo Duqa Magaalada",
      excerpt:
        "Doorashooyinka maamulka hoose ayaa loo qorsheeyay gobolka Banaadir, iyadoo doorashada golayaasha degmooyinka iyo xulidda duqa Muqdisho ay imtixaan gelinayaan kala-guurka adag ee cod-toos ah.",
      body: [
        "Maamulku waxay dejiyeen jadwal doorashooyinka maamulka hoose ee gobolka Banaadir, iyadoo la qorsheeyay doorashada golayaasha degmooyinka, kuna xigaysa doorashada duqa iyo ku-xigeenka magaalada Muqdisho. Guddida doorashada qaranku waxay sheegtay in codaynta lagu qaban doono si xor, caddaalad iyo hufnaan leh oo waafaqsan sharciga Soomaaliya, waxayna ugu baaqday daneeyayaasha siyaasadda, hay'adaha dowladda iyo bulshada rayidka ah inay iskaashadaan.",
        "Tartannada Banaadir waa qayb ka mid ah jadwal ballaadhan oo doorashooyin dowlad-goboleed iyo maxalli ah. Saraakiishu waxay ku tilmaameen kuwo dhisme u ah wareejinta muddada dheer la ballanqaaday ee Soomaaliya ee ka gudbaysa nidaam dadban oo qabaa'il ku dhisan una gudbaysa doorasho toos ah — kala-guur si isdaba-joog ah loogu dib-dhigay khilaaf siyaasadeed.",
        "Waqtigu waa mid xasaasi ah. Sii-deynta guddidu ee jadwalka doorashadu waxay iyadu keentay muran, iyadoo timid xilli aan la xallin wadahadallada u dhexeeya dowladda federaalka iyo mucaaradka ee ku saabsan qaabka ay dalku ku codayn lahaa. Dadka dhaleeceeyaa waxay ka digeen in daabacaadda taariikhaha ka hor inta aan la gaadhin heshiis siyaasadeed ay khatar gelinayso in ay sii adkeeyaan kala-qaybsanaanta halkii ay xallin lahaayeen.",
        "Dadka deggan caasimadda, doorashooyinku waxay leeyihiin culays wax-ku-ool ah oo ka baxsan khilaafka qaran. Golayaasha degmooyinka iyo duqnimadu waxay qaabeeyaan ganacsiga maalinlaha ah ee magaalada — adeegyada, amniga iyo maamulka maxalliga ah — cod xurmo leh oo hab-dhaqan wanaagsan oo Muqdisho ka dhaca wuxuu bixin lahaa calaamad hore oo muujinaysa in hammiyada doorasho ee Soomaaliya ee ballaadhan la gaadhi karo ficil ahaan.",
      ],
    },
    ar: {
      title: "مقديشو تستعد لانتخابات مجالس الأحياء ومنصب العمدة",
      excerpt:
        "من المقرر إجراء انتخابات الحكم المحلي في إقليم بنادر، حيث ستختبر انتخابات مجالس الأحياء واختيار عمدة مقديشو انتقال البلاد المضطرب نحو التصويت المباشر.",
      body: [
        "وضعت السلطات جدولاً زمنياً لانتخابات الحكم المحلي في إقليم بنادر، مع تحديد موعد لانتخابات مجالس الأحياء يليها انتخاب عمدة مقديشو ونائبه. وقالت اللجنة الانتخابية الوطنية إن التصويت سيُجرى بطريقة حرة ونزيهة وشفافة وفقاً للقانون الصومالي، ودعت أصحاب المصلحة السياسيين والمؤسسات الحكومية والمجتمع المدني إلى التعاون.",
        "وتشكّل منافسات بنادر جزءاً من جدول أوسع لانتخابات الولايات الأعضاء والانتخابات المحلية. وقد صوّرها المسؤولون بوصفها لبنات في تحوّل الصومال الموعود منذ زمن من نظام غير مباشر قائم على العشائر نحو انتخابات مباشرة — وهو انتقال تأجّل مراراً بسبب الخلاف السياسي.",
        "والتوقيت حساس. فإصدار اللجنة لجدول زمني انتخابي أثبت أنه مثير للجدل بحد ذاته، إذ جاء وسط مفاوضات لم تُحسم بين الحكومة الاتحادية والمعارضة حول النموذج ذاته الذي ينبغي أن تصوّت البلاد بموجبه. وحذّر منتقدون من أن نشر المواعيد قبل التوصل إلى توافق سياسي يهدد بترسيخ الانقسامات بدلاً من حلها.",
        "وبالنسبة لسكان العاصمة، تحمل الانتخابات وزناً عملياً يتجاوز النزاع الوطني. فمجالس الأحياء ومنصب العمدة تشكّل شؤون المدينة اليومية — الخدمات والأمن والإدارة المحلية — ومن شأن تصويت ذي مصداقية ومنظّم في مقديشو أن يقدّم إشارة مبكرة إلى ما إذا كانت طموحات الصومال الانتخابية الأوسع قابلة للتحقيق عملياً.",
      ],
    },
  },

  // ============ LOCAL NEWS 3 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Somali Communities Lean on Diaspora Remittances as Local Pressures Mount",
      excerpt:
        "As drought and economic strain squeeze household budgets, money sent home by Somalis abroad — channelled increasingly through mobile wallets — remains a vital lifeline for families.",
      body: [
        "For millions of Somali families, money sent home from relatives abroad is not a supplement but a foundation. Remittances have long underpinned household consumption, school fees and small-business capital, and as drought and economic strain deepen, that lifeline has taken on renewed importance for communities with few other buffers.",
        "The way that money moves has been transformed by the country's mobile-money revolution. Where remittances once passed through informal hawala networks and cash handoffs, transfers increasingly land directly in digital wallets, allowing recipients in towns and rural districts alike to receive funds quickly and spend them without ever handling cash. Services built by operators such as Hormuud have made international transfers a routine feature of everyday phones.",
        "That convenience matters most in hard times. With roughly one in three Somalis facing crisis levels of food insecurity and displacement rising, the speed and reach of digital remittances can mean the difference between a family weathering a shock and being pushed over the edge. Aid agencies have noted that cash and digital transfers often complement formal humanitarian assistance, giving households flexibility that in-kind aid cannot.",
        "Yet reliance on remittances also exposes a vulnerability. Flows can be disrupted by regulation abroad, by the rising cost of living in host countries, and by pressure on international money-transfer channels. As Somalia works to formalise its financial system and integrate with regional payment networks, officials hope to make these flows cheaper and more secure — reinforcing a source of resilience that families cannot afford to lose.",
      ],
    },
    so: {
      title: "Bulshooyinka Soomaaliyeed oo ku Tiirsan Xawaaladda Qurbajoogta iyadoo Cadaadiska Maxalliga ah Sii Kordhayo",
      excerpt:
        "Iyadoo abaarta iyo cadaadiska dhaqaale ay cidhiidhiyaan miisaaniyadda qoysaska, lacagta ay Soomaalida dibadda joogtaa guriga u soo dirto — oo si isa soo taraysa loo maro jeebabka mobaylka — waxay weli tahay tiir-dhabaan muhiim ah.",
      body: [
        "Malaayiin qoys oo Soomaaliyeed, lacagta ay ka soo dirto ehelka dibadda joogaa ma aha mid dheeraad ah ee waa aasaas. Xawaaladdu waxay muddo dheer taageertay isticmaalka qoyska, khidmadaha dugsiyada iyo raasumaalka ganacsiyada yaryar, iyadoo abaarta iyo cadaadiska dhaqaale ay sii xumaanayaan, tiir-dhabaankaasi wuxuu muhiimad cusub u yeeshay bulshooyinka aan haysan wax kale oo yar oo ay isku hayaan.",
        "Habka ay lacagtaasi u dhaqaaqdo waxaa beddelay kacaanka lacagta-mobaylka ee dalka. Halkii ay xawaaladdu mar dhex mari jirtay shabakadaha xawaalada aan rasmiga ahayn iyo wareejinta caddaanka ah, wareejinta ayaa si isa soo taraysa si toos ah ugu dhacaysa jeebabka dhijitaalka ah, taasoo u ogolaanaysa qaataanka magaalooyinka iyo degmooyinka miyiga ah labadaba inay lacagta si dhaqso ah u helaan oo ay ku bixiyaan iyagoon waligood caddaan taaban. Adeegyada ay dhiseen hawlwadeenno sida Hormuud waxay wareejinta caalamiga ah ka dhigeen astaan caadi ah oo taleefannada maalinlaha ah.",
        "Fududayntaasi waxay muhiim tahay marka ugu adag. Iyadoo ku dhawaad saddex-meelood meel Soomaalida ay wajahayaan heerar amni-cunto oo halis ah barakacuna uu kordhayo, xawaaraha iyo gaadhista xawaaladda dhijitaalka ah waxay ka dhigan karaan farqiga u dhexeeya qoys naafto ka soo baxaya iyo mid la riixay qararka. Hay'adaha gargaarku waxay xuseen in wareejinta caddaanka iyo dhijitaalku ay inta badan dhammaystiraan gargaarka bini'aadantinimada ee rasmiga ah, iyagoo qoysaska siinaya dabacsanaan aan gargaarka noocaa ahi bixin karin.",
        "Haddana ku-tiirsanaanta xawaaladdu waxay sidoo kale muujinaysaa nugaal. Socodka lacagta waxaa carqaladayn kara sharciyaynta dibadda, kharashka nolosha oo sii kordhaya dalalka martida-galiya, iyo cadaadiska ku yimaada marinnada wareejinta lacagta caalamiga ah. Iyadoo Soomaaliya ay ku dadaalayso inay rasmiyayso nidaamkeeda maaliyadeed oo ay isku darto shabakadaha lacag-bixinta gobolka, saraakiishu waxay rajaynayaan inay ka dhigaan socodkan mid ka jaban oo ammaan badan — taasoo xoojinaysa il adkaysi ah oo aanay qoysasku awoodi karin inay lumiyaan.",
      ],
    },
    ar: {
      title: "المجتمعات الصومالية تعتمد على تحويلات المغتربين مع تزايد الضغوط المحلية",
      excerpt:
        "مع ضغط الجفاف والضائقة الاقتصادية على ميزانيات الأسر، تظل الأموال التي يرسلها الصوماليون في الخارج — عبر المحافظ الإلكترونية بشكل متزايد — شريان حياة حيوياً للعائلات.",
      body: [
        "بالنسبة لملايين الأسر الصومالية، فإن الأموال المرسلة من الأقارب في الخارج ليست مكمّلاً بل أساساً. فقد دعمت التحويلات منذ زمن طويل استهلاك الأسر ورسوم المدارس ورأس مال المشاريع الصغيرة، ومع تعمّق الجفاف والضائقة الاقتصادية، اكتسب هذا الشريان أهمية متجددة لمجتمعات لا تملك سوى القليل من وسائل الحماية الأخرى.",
        "وقد تحوّلت طريقة انتقال هذه الأموال بفعل ثورة الأموال عبر الهاتف المحمول في البلاد. فحيث كانت التحويلات تمرّ سابقاً عبر شبكات الحوالة غير الرسمية وتسليم النقد يداً بيد، أصبحت التحويلات تصل بشكل متزايد مباشرة إلى المحافظ الإلكترونية، مما يتيح للمستفيدين في البلدات والأرياف على حد سواء تلقّي الأموال بسرعة وإنفاقها دون التعامل مع النقد إطلاقاً. وقد جعلت خدمات بنتها شركات مثل هرمود التحويلات الدولية سمة روتينية في الهواتف اليومية.",
        "وتزداد أهمية هذه السهولة في الأوقات الصعبة. فمع مواجهة نحو ثلث الصوماليين مستويات أزمة من انعدام الأمن الغذائي وتزايد النزوح، يمكن أن تعني سرعة التحويلات الرقمية ونطاق وصولها الفرق بين أسرة تتجاوز صدمة وأخرى تُدفع إلى الحافة. وقد لاحظت وكالات الإغاثة أن التحويلات النقدية والرقمية كثيراً ما تكمّل المساعدة الإنسانية الرسمية، مانحةً الأسر مرونة لا تستطيع المساعدة العينية توفيرها.",
        "غير أن الاعتماد على التحويلات يكشف أيضاً عن هشاشة. فقد تتعطّل التدفقات بفعل التنظيم في الخارج، وارتفاع تكلفة المعيشة في الدول المضيفة، والضغط على قنوات تحويل الأموال الدولية. ومع سعي الصومال إلى إضفاء الطابع الرسمي على نظامه المالي والاندماج مع شبكات المدفوعات الإقليمية، يأمل المسؤولون في جعل هذه التدفقات أرخص وأكثر أماناً — بما يعزّز مصدر مرونة لا تستطيع الأسر تحمّل خسارته.",
      ],
    },
  },

  // ============ TECHNOLOGY 4 ============
  {
    categoryKey: "technology",
    en: {
      title: "Mogadishu's Young Coders Build Apps to Solve Everyday Problems",
      excerpt:
        "A growing community of self-taught developers in the capital is turning local frustrations — from taxi fares to market prices — into mobile applications built for Somali users.",
      body: [
        "In a modest co-working space in Mogadishu, a small group of young developers gathers most evenings to write code by laptop light. Largely self-taught through online courses and shared tutorials, they are building mobile applications aimed squarely at problems they know intimately: unpredictable taxi fares, fluctuating market prices, and the difficulty of finding reliable local services.",
        "The movement reflects a broader shift. As smartphone ownership spreads and mobile data becomes cheaper, a domestic market for locally-relevant apps has begun to take shape. Developers say building for Somali users means designing for intermittent connectivity, low-cost devices, and interfaces that work in the Somali language rather than only in English.",
        "Funding remains the hardest obstacle. With few local investors and limited access to international venture capital, most projects are bootstrapped in spare time around other jobs. Some founders hope that partnerships with established telecom and mobile-money companies could provide both distribution and a path to revenue.",
        "Still, the energy is real. Community-run meetups, informal mentorship, and a willingness to share knowledge have created a foundation that did not exist a few years ago. Whether any single app scales or not, participants argue, the deeper gain is a growing pool of local technical talent — people who can build, maintain, and imagine digital tools for their own communities.",
      ],
    },
    so: {
      title: "Barnaamij-sameeyayaasha Dhallinyarada ah ee Muqdisho oo Dhisa Ab-abyo Xalliya Dhibaatooyinka Maalinlaha ah",
      excerpt:
        "Bulsho sii kordheysa oo ah horumariyeyaal is-baray oo caasimadda jooga ayaa u rogaya dhibaatooyinka maxalliga ah — laga bilaabo qiimaha taksiga ilaa qiimaha suuqa — ab-abyo mobayl oo loogu talagalay isticmaaleyaasha Soomaalida.",
      body: [
        "Goob-shaqo yar oo ku taal Muqdisho, koox yar oo horumariyeyaal dhallinyaro ah ayaa fadhiista fiidkii badi si ay u qoraan koodh iyagoo iftiinka kombuyuutarkooda ku shaqeynaya. Iyagoo inta badan is-baray koorsooyin online ah iyo casharro la wadaago, waxay dhisayaan ab-abyo mobayl oo si toos ah wax uga qabanaya dhibaatooyin ay si fiican u yaqaanaan: qiimaha taksiga oo aan la saadaalin karin, qiimaha suuqa oo isbeddelaya, iyo dhibaatada lagu helo adeegyo maxalli ah oo la isku halleyn karo.",
        "Dhaqdhaqaaqan wuxuu ka tarjumayaa isbeddel ballaadhan. Iyadoo lahaanshaha telefoonnada casriga ah uu faafayo iyo xogta mobaylku ay raqiis noqoneyso, suuq gudaha ah oo loogu talagalay ab-abyo la xiriira deegaanka ayaa bilaabay inuu qaab yeesho. Horumariyeyaashu waxay sheegaan in dhisidda isticmaaleyaasha Soomaalida ay ka dhigan tahay naqshadeynta xiriir gooya, aaladaha qiimahoodu jaban yahay, iyo interfaces ku shaqeeya afka Soomaaliga halkii ay ka ahaan lahaayeen Ingiriisiga oo kaliya.",
        "Maalgelintu weli waa caqabadda ugu adag. Iyadoo ay yar yihiin maalgeliyeyaasha maxalliga ah oo ay xaddidan tahay helitaanka raasumaalka caalamiga ah, mashaariicda badankood waxaa lagu maalgeliyaa waqti-firaaqo agagaarka shaqooyin kale. Aasaasayaasha qaarkood waxay rajeynayaan in iskaashi lala yeesho shirkadaha telecom-ka iyo lacagta mobaylka uu bixin karo qaybinta iyo dariiq dakhli.",
        "Weli, tamartu waa mid dhab ah. Kulanno ay bulshadu maamusho, la-talin aan rasmi ahayn, iyo diyaar-garow lagu wadaago aqoonta ayaa abuuray aasaas aan jirin dhowr sano ka hor. Haddii ab-ab kasta uu balaadho iyo in kale, waxqabtayaashu waxay ku doodaan, in faa'iidada ugu qoto dheeri tahay kelmed sii kordheysa oo xirfadlayaal farsamo maxalli ah — dad awood u leh inay dhisaan, dayactiraan, oo qiyaasaan qalabka dijitaalka ah ee bulshadooda.",
      ],
    },
    ar: {
      title: "مبرمجو مقديشو الشباب يبنون تطبيقات لحل مشكلات الحياة اليومية",
      excerpt:
        "مجتمع متنامٍ من المطورين العصاميين في العاصمة يحوّل الإحباطات المحلية — من أجرة سيارات الأجرة إلى أسعار السوق — إلى تطبيقات محمولة مصممة للمستخدمين الصوماليين.",
      body: [
        "في مساحة عمل مشتركة متواضعة في مقديشو، تجتمع مجموعة صغيرة من المطورين الشباب معظم الأمسيات لكتابة الشيفرة على ضوء حواسيبهم المحمولة. وقد تعلّم هؤلاء أنفسهم إلى حد كبير عبر الدورات على الإنترنت والدروس المتبادلة، وهم يبنون تطبيقات محمولة تستهدف مباشرةً مشكلات يعرفونها عن قرب: أجرة سيارات الأجرة غير المتوقعة، وأسعار السوق المتقلبة، وصعوبة إيجاد خدمات محلية موثوقة.",
        "تعكس هذه الحركة تحولاً أوسع. فمع انتشار امتلاك الهواتف الذكية وانخفاض تكلفة بيانات الهاتف، بدأت سوق محلية للتطبيقات ذات الصلة بالبيئة المحلية تتشكّل. ويقول المطورون إن البناء للمستخدمين الصوماليين يعني التصميم لاتصال متقطع، وأجهزة منخفضة التكلفة، وواجهات تعمل باللغة الصومالية وليس بالإنجليزية وحدها.",
        "يبقى التمويل أصعب عقبة. فمع قلة المستثمرين المحليين ومحدودية الوصول إلى رأس المال الاستثماري الدولي، تُموَّل معظم المشاريع ذاتياً في أوقات الفراغ حول وظائف أخرى. ويأمل بعض المؤسسين أن توفر الشراكات مع شركات الاتصالات والأموال عبر الهاتف الراسخة كلاً من التوزيع ومساراً نحو الإيرادات.",
        "ومع ذلك، فإن الحماس حقيقي. فقد أوجدت اللقاءات التي يديرها المجتمع، والإرشاد غير الرسمي، والاستعداد لتبادل المعرفة أساساً لم يكن موجوداً قبل بضع سنوات. وسواء توسّع أي تطبيق بعينه أم لا، يرى المشاركون أن المكسب الأعمق هو مجموعة متنامية من المواهب التقنية المحلية — أشخاص قادرون على بناء الأدوات الرقمية لمجتمعاتهم وصيانتها وتخيّلها.",
      ],
    },
  },

  // ============ INTERNATIONAL (politics) 4 ============
  {
    categoryKey: "politics",
    en: {
      title: "Global Leaders Gather for Summit on Climate Finance for Developing Nations",
      excerpt:
        "Delegates from dozens of countries have convened to negotiate how wealthier economies will help fund climate adaptation in the nations most exposed to a warming planet.",
      body: [
        "Representatives from dozens of countries gathered this week for a high-level summit focused on one of the most contentious questions in international climate policy: how much wealthier nations should pay to help developing countries adapt to a changing climate, and how that money should be delivered.",
        "For nations across Africa, South Asia, and small island states, the stakes are immediate. Many face intensifying droughts, floods, and storms while contributing only a fraction of historical emissions. Their negotiators have pressed for financing that arrives as grants rather than loans, arguing that debt-based climate aid deepens the very vulnerabilities it is meant to address.",
        "Wealthier governments, facing their own domestic budget pressures, have urged a broader base of contributors and a greater role for private investment. The gap between pledges announced at past summits and money actually disbursed has become a recurring source of frustration, eroding trust in the negotiations.",
        "Observers caution that the summit is unlikely to resolve the deadlock in a single sitting. Yet even incremental progress — clearer timelines, firmer commitments, simpler access to funds — would matter to communities already living with the consequences. The talks, analysts say, are less about distant targets than about whether the world's response keeps pace with a crisis unfolding now.",
      ],
    },
    so: {
      title: "Hoggaamiyeyaasha Caalamka oo u Shiray Shir-madaxeed ku saabsan Maalgelinta Cimilada ee Dalalka Soo Koraya",
      excerpt:
        "Ergooyin ka socda dhowr iyo toban dal ayaa isugu yimid si ay uga wada hadlaan sida dhaqaalayaasha hodanka ah ay uga caawin doonaan maalgelinta la-qabsiga cimilada ee dalalka ugu nugul adduun sii kululaanaya.",
      body: [
        "Wakiillo ka kala socda dhowr iyo toban dal ayaa toddobaadkan u shiray shir-madaxeed heer sare ah oo diiradda lagu saaray mid ka mid ah su'aalaha ugu muranka badan siyaasadda cimilada caalamiga ah: inta ay tahay in dalalka hodanka ahi bixiyaan si ay uga caawiyaan dalalka soo koraya inay la qabsadaan cimilo isbeddeleysa, iyo sida lacagtaas loo gudbin doono.",
        "Dalalka ku baahsan Afrika, Koonfurta Aasiya, iyo dowladaha jasiiradaha yaryar, khatartu waa mid degdeg ah. Qaar badan ayaa wajahaya abaaro, daadad, iyo duufaanno sii xoogaysanaya iyagoo gacan ka geystay oo kaliya qayb yar oo ka mid ah qiiqa taariikhiga ah. Gorgortamayaashoodu waxay ku cadaadiyeen maalgelin u timaadda deeqo halkii ay ka ahaan lahayd amaah, iyagoo ku dooday in kaalmada cimilada ee amaahda ku saleysan ay sii xoojineyso nuglaanshaha ay tahay inay wax ka qabato.",
        "Dowladaha hodanka ah, oo wajahaya cadaadis miisaaniyadeed gudaha ah, ayaa ku booriyay saldhig ballaadhan oo ka-qaybgalayaal ah iyo door weyn oo maalgashiga gaarka ah. Farqiga u dhexeeya ballanqaadyada lagu dhawaaqay shir-madaxeedyadii hore iyo lacagta dhab ahaan la bixiyay ayaa noqday ilo caro oo soo noqnoqda, taasoo dhaawacaysa kalsoonida gorgortanka.",
        "Goobjoogayaashu waxay ka digayaan in shir-madaxeedku uusan u badnayn inuu xalliyo istaagga hal fadhi. Haddana xitaa horumar tartiib ah — jadwalyo cad, ballanqaadyo adag, helitaan fudud oo lacagaha — ayaa muhiim u ah bulshooyinka mar hore la nool cawaaqibka. Wadahadalladu, falanqeeyayaashu waxay yiraahdeen, ma aha wax ku saabsan bartilmaameedyo fog intii ay ka ahaan lahaayeen ma jawaabta adduunku ay la socoto qalalaase hadda socda.",
      ],
    },
    ar: {
      title: "قادة العالم يجتمعون في قمة حول تمويل المناخ للدول النامية",
      excerpt:
        "اجتمع مندوبون من عشرات الدول للتفاوض حول كيفية مساعدة الاقتصادات الأكثر ثراءً في تمويل التكيف المناخي في البلدان الأكثر تعرضاً لكوكب يزداد احتراراً.",
      body: [
        "اجتمع ممثلون من عشرات الدول هذا الأسبوع في قمة رفيعة المستوى ركّزت على واحدة من أكثر المسائل إثارة للجدل في سياسة المناخ الدولية: كم ينبغي أن تدفع الدول الأكثر ثراءً لمساعدة البلدان النامية على التكيف مع مناخ متغير، وكيف ينبغي أن تُقدَّم هذه الأموال.",
        "بالنسبة للدول في أنحاء أفريقيا وجنوب آسيا والدول الجزرية الصغيرة، فإن المخاطر آنية. إذ يواجه كثيرون حالات جفاف وفيضانات وعواصف متزايدة الشدة بينما لم يسهموا إلا بجزء ضئيل من الانبعاثات التاريخية. وقد ضغط مفاوضوهم من أجل تمويل يصل على شكل منح لا قروض، بحجة أن المساعدة المناخية القائمة على الديون تعمّق أوجه الهشاشة ذاتها التي يُفترض أن تعالجها.",
        "أما الحكومات الأكثر ثراءً، التي تواجه ضغوطاً على ميزانياتها الداخلية، فقد دعت إلى قاعدة أوسع من المساهمين ودور أكبر للاستثمار الخاص. وقد أصبحت الفجوة بين التعهدات المعلنة في القمم الماضية والأموال المصروفة فعلياً مصدر إحباط متكرر يقوّض الثقة في المفاوضات.",
        "ويحذّر المراقبون من أن القمة من غير المرجح أن تحل الجمود في جلسة واحدة. ومع ذلك، فإن حتى التقدم التدريجي — جداول زمنية أوضح، والتزامات أكثر حزماً، ووصولاً أبسط إلى الأموال — سيكون مهماً لمجتمعات تعيش بالفعل مع العواقب. والمحادثات، كما يقول المحللون، تتعلق بما إذا كانت استجابة العالم تواكب أزمة تتكشف الآن أكثر من تعلقها بأهداف بعيدة.",
      ],
    },
  },

  // ============ LOCAL NEWS 4 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Fishing Communities Along Somalia's Coast Invest in Cold Storage",
      excerpt:
        "New refrigeration facilities in coastal towns are helping fishers preserve their catch, reduce waste, and reach markets further inland for the first time.",
      body: [
        "Along stretches of Somalia's long coastline, fishing cooperatives have begun installing cold storage facilities that are quietly transforming a centuries-old livelihood. For generations, fishers faced a stark limit: without refrigeration, the day's catch had to be sold quickly and cheaply, or risk spoiling in the heat.",
        "The new facilities, some powered by solar panels to cope with unreliable electricity, allow fish to be stored and transported over longer distances. Fishers say this has begun to change the economics of their work, letting them hold stock for better prices and supply markets in inland towns that previously had little access to fresh seafood.",
        "Somalia has one of the longest coastlines in Africa, and its waters are rich with fish. Yet the sector has long been underdeveloped, hampered by limited infrastructure, insecurity at sea, and competition from foreign vessels. Local advocates argue that modest investments in storage, ice, and transport could unlock significant value for coastal communities.",
        "Challenges remain, from maintaining equipment to securing steady demand. But for the fishing families involved, the change is tangible. Where a good catch once meant a race against spoilage, it now offers the possibility of planning, saving, and building a more stable future from the sea.",
      ],
    },
    so: {
      title: "Bulshooyinka Kalluumeysiga ee Xeebaha Soomaaliya oo Maalgeliya Kaydinta Qaboojinta",
      excerpt:
        "Xarumo cusub oo qaboojin ah oo ku yaal magaalooyinka xeebaha ayaa ka caawinaya kalluumeysatada inay ilaaliyaan waxa ay qabtaan, yareeyaan qashinka, oo gaaraan suuqyo gudaha dhaca ah markii ugu horreysay.",
      body: [
        "Meelo ka mid ah xeebta dheer ee Soomaaliya, iskaashatooyinka kalluumeysiga ayaa bilaabay inay rakibaan xarumo kaydin qaboojin ah oo si aamusnaan ah u beddelaya nolol-maalmeedka qarniyo jiray. Farac ka farac, kalluumeysatadu waxay wajaheen xad adag: iyadoo aan qaboojin jirin, kalluunka maalinta waa in si degdeg ah oo raqiis ah loo iibiyaa, ama halis ah inuu ku xumaado kulaylka.",
        "Xarumaha cusub, kuwaas oo qaarkood ku shaqeeya alwaaxyada qorraxda si ay ula qabsadaan koronto aan la isku halleyn karin, waxay u oggolaadaan in kalluunka la kaydiyo oo loo qaado masaafo dheer. Kalluumeysatadu waxay sheegaan in tani ay bilowday inay beddesho dhaqaalaha shaqadooda, iyagoo u oggolaanaya inay hayaan alaab qiimo wanaagsan iyo inay siiyaan suuqyada magaalooyinka gudaha ah ee hore u lahaa helitaan yar oo cunto badeed cusub ah.",
        "Soomaaliya waxay leedahay mid ka mid ah xeebaha ugu dhaadheer Afrika, biyaheeduna waxay hodan ku yihiin kalluun. Haddana qaybtan waa mid muddo dheer aan la horumarin, oo ay hor istaagtay kaabayaal xaddidan, amni-darro badda ka jirta, iyo tartanka maraakiibta shisheeye. U-doodayaasha maxalliga ah waxay ku doodaan in maalgelin yar oo lagu sameeyo kaydinta, barafka, iyo gaadiidka ay furi karto qiimo weyn oo loogu talagalay bulshooyinka xeebaha.",
        "Caqabado ayaa weli jira, laga bilaabo dayactirka qalabka ilaa xaqiijinta baahi joogto ah. Laakiin qoysaska kalluumeysiga ku lugta leh, isbeddelku waa mid la taaban karo. Meesha qabsasho wanaagsani mar ay ka dhigneyd tartan ka dhan ah xumaanshaha, hadda waxay bixisaa suurtogalnimada qorsheynta, kaydinta, iyo dhisidda mustaqbal deggan oo badda laga helo.",
      ],
    },
    ar: {
      title: "مجتمعات الصيد على ساحل الصومال تستثمر في التخزين المبرّد",
      excerpt:
        "تساعد مرافق التبريد الجديدة في البلدات الساحلية الصيادين على حفظ صيدهم وتقليل الهدر والوصول إلى أسواق أبعد في الداخل للمرة الأولى.",
      body: [
        "على امتداد أجزاء من ساحل الصومال الطويل، بدأت تعاونيات الصيد بتركيب مرافق تخزين مبرّد تحوّل بهدوء سبل عيش عمرها قرون. فلأجيال، واجه الصيادون قيداً صارماً: فمن دون تبريد، كان لا بد من بيع صيد اليوم بسرعة وبثمن بخس، وإلا خاطر بالفساد في الحر.",
        "وتتيح المرافق الجديدة، التي يعمل بعضها بالألواح الشمسية للتعامل مع الكهرباء غير الموثوقة، تخزين الأسماك ونقلها لمسافات أطول. ويقول الصيادون إن هذا بدأ يغيّر اقتصاديات عملهم، إذ يتيح لهم الاحتفاظ بالمخزون للحصول على أسعار أفضل وتزويد أسواق البلدات الداخلية التي لم يكن لديها سابقاً سوى وصول ضئيل إلى المأكولات البحرية الطازجة.",
        "يملك الصومال أحد أطول السواحل في أفريقيا، ومياهه غنية بالأسماك. ومع ذلك، ظل القطاع غير متطور لفترة طويلة، معوَّقاً بالبنية التحتية المحدودة وانعدام الأمن في البحر والمنافسة من السفن الأجنبية. ويرى المدافعون المحليون أن استثمارات متواضعة في التخزين والثلج والنقل يمكن أن تطلق قيمة كبيرة للمجتمعات الساحلية.",
        "تبقى التحديات قائمة، من صيانة المعدات إلى تأمين طلب ثابت. لكن بالنسبة لأسر الصيد المعنية، فإن التغيير ملموس. فحيث كان الصيد الوفير يعني ذات يوم سباقاً ضد الفساد، بات يتيح الآن إمكانية التخطيط والادخار وبناء مستقبل أكثر استقراراً من البحر.",
      ],
    },
  },

  // ============ TECHNOLOGY 5 ============
  {
    categoryKey: "technology",
    en: {
      title: "Undersea Cable Upgrade Promises Faster Internet Across the Horn of Africa",
      excerpt:
        "A new investment in submarine fibre-optic capacity is set to boost internet speeds and resilience for a region long dependent on a handful of vulnerable connections.",
      body: [
        "A planned upgrade to the submarine cable infrastructure serving the Horn of Africa promises to significantly increase internet capacity for a region that has long depended on a small number of undersea connections. The additional capacity is expected to improve both speed and reliability for millions of users.",
        "For countries in the region, connectivity has historically been a bottleneck. A cut to a single cable — whether from a ship's anchor, an earthquake, or equipment failure — has in the past slowed or severed internet access for entire nations. Adding capacity and redundant routes reduces that fragility.",
        "Faster, more reliable connectivity carries broad implications. It underpins the mobile-money systems that much of the regional economy now runs on, supports the growth of digital services, and makes possible everything from remote education to cloud-based business tools. Analysts note that infrastructure of this kind is a precondition for the digital economy many governments are trying to build.",
        "The benefits, however, depend on the so-called last mile — the local networks that carry data from landing stations to homes and businesses. Without parallel investment in domestic infrastructure and affordable access, the gains from greater international capacity may not reach the users who need them most.",
      ],
    },
    so: {
      title: "Casriyeynta Fiilada Badda-hoosaadka ah oo Ballanqaadaysa Internet Dhaqso ah oo ku Baahsan Geeska Afrika",
      excerpt:
        "Maalgelin cusub oo lagu sameeyay awoodda fiilada fiber-optic-ka ee badda-hoosaadka ah ayaa la filayaa inuu kordhiyo xawaaraha internetka iyo adkaysiga gobol muddo dheer ku tiirsanaa dhowr xiriir oo nugul.",
      body: [
        "Casriyeyn la qorsheeyay oo lagu sameeyay kaabayaasha fiilada badda-hoosaadka ah ee u adeegta Geeska Afrika ayaa ballanqaadaysa inuu si weyn u kordhiyo awoodda internetka gobol muddo dheer ku tiirsanaa tiro yar oo xiriirro badda-hoosaad ah. Awoodda dheeraadka ah waxaa la filayaa inay hagaajiso xawaaraha iyo la-isku-halleynta malaayiin isticmaaleyaal ah.",
        "Dalalka gobolka, xiriirku taariikh ahaan wuxuu ahaa caqabad. Goynta hal fiilo — ha ahaato barroosinka markab, dhulgariir, ama cilad qalab — waxay hore u dib-udhigtay ama gooysay helitaanka internetka umadaha oo dhan. Ku darista awood iyo dariiqyo dheeraad ah ayaa yareeya nuglaanshahaas.",
        "Xiriir dhaqso badan oo la isku halleyn karo wuxuu leeyahay saameyn ballaadhan. Wuxuu taageeraa nidaamyada lacagta mobaylka ee dhaqaalaha gobolka intiisa badan hadda ku shaqeeyaan, wuxuu taageeraa koritaanka adeegyada dijitaalka ah, oo wuxuu suurtogal ka dhigaa wax kasta oo laga bilaabo waxbarasho fog ilaa qalabka ganacsi ee daruuraha ku saleysan. Falanqeeyayaashu waxay xuseen in kaabayaal noocan oo kale ah ay tahay shuruud looga baahan yahay dhaqaalaha dijitaalka ah ee dowlado badani ay isku dayayaan inay dhisaan.",
        "Faa'iidooyinka, si kastaba ha ahaatee, waxay ku xiran yihiin waxa loogu yeero mayl-kii ugu dambeeyay — shabakadaha maxalliga ah ee xogta ka qaada saldhigyada dhulka ilaa guryaha iyo ganacsiyada. La'aanta maalgelin barbar socota oo lagu sameeyo kaabayaasha gudaha iyo helitaan la awoodi karo, faa'iidooyinka awoodda caalamiga ah oo weyn ayaan laga yaabo inay gaaraan isticmaaleyaasha ugu baahan.",
      ],
    },
    ar: {
      title: "ترقية الكابل البحري تَعِد بإنترنت أسرع في أنحاء القرن الأفريقي",
      excerpt:
        "استثمار جديد في سعة الألياف الضوئية البحرية يُتوقع أن يعزز سرعات الإنترنت ومرونته لمنطقة اعتمدت طويلاً على حفنة من الوصلات الهشة.",
      body: [
        "تَعِد ترقية مخطط لها للبنية التحتية للكابلات البحرية التي تخدم القرن الأفريقي بزيادة كبيرة في سعة الإنترنت لمنطقة اعتمدت طويلاً على عدد قليل من الوصلات البحرية. ومن المتوقع أن تحسّن السعة الإضافية كلاً من السرعة والموثوقية لملايين المستخدمين.",
        "بالنسبة لدول المنطقة، كان الاتصال تاريخياً عنق زجاجة. فقطع كابل واحد — سواء من مرساة سفينة أو زلزال أو عطل في المعدات — أدى في الماضي إلى إبطاء أو قطع الوصول إلى الإنترنت لأمم بأكملها. وإضافة السعة والمسارات الاحتياطية تقلل من تلك الهشاشة.",
        "يحمل الاتصال الأسرع والأكثر موثوقية آثاراً واسعة. فهو يدعم أنظمة الأموال عبر الهاتف التي يعمل عليها الآن جزء كبير من اقتصاد المنطقة، ويدعم نمو الخدمات الرقمية، ويجعل ممكناً كل شيء من التعليم عن بُعد إلى أدوات الأعمال السحابية. ويلاحظ المحللون أن بنية تحتية من هذا النوع شرط مسبق للاقتصاد الرقمي الذي تحاول حكومات كثيرة بناءه.",
        "غير أن الفوائد تعتمد على ما يُسمى الميل الأخير — الشبكات المحلية التي تنقل البيانات من محطات الإنزال إلى المنازل والشركات. فمن دون استثمار موازٍ في البنية التحتية المحلية والوصول الميسور التكلفة، قد لا تصل مكاسب السعة الدولية الأكبر إلى المستخدمين الأكثر حاجة إليها.",
      ],
    },
  },

  // ============ INTERNATIONAL (politics) 5 ============
  {
    categoryKey: "politics",
    en: {
      title: "Regional Bloc Pushes for Deeper Trade Integration Across East Africa",
      excerpt:
        "Member states are negotiating to lower barriers, harmonise standards, and ease the movement of goods across borders in a bid to boost intra-regional commerce.",
      body: [
        "Governments across East Africa are pressing forward with negotiations aimed at deepening economic integration, seeking to lower tariffs, harmonise product standards, and streamline the movement of goods across their shared borders. Proponents argue that reducing friction in regional trade could unlock growth that individual national markets cannot achieve alone.",
        "Intra-regional trade in East Africa has historically lagged behind other parts of the world, held back by inconsistent regulations, cumbersome customs procedures, and gaps in transport infrastructure. A truck carrying goods across several borders can face days of delay, adding cost that ultimately falls on consumers and businesses.",
        "The push aligns with a broader continental effort to build a single African market, a long-term project that many economists see as essential to the continent's development. Regional integration is often described as a testing ground: if neighbouring states can align their rules and trust one another's institutions, the wider vision becomes more credible.",
        "Yet integration is politically delicate. Governments worry about protecting domestic industries, losing tariff revenue, and ceding sovereignty over economic policy. Negotiators face the difficult task of balancing these concerns against the collective benefits of a larger, more open market — a balance that will determine how far and how fast integration proceeds.",
      ],
    },
    so: {
      title: "Ururka Gobolka oo Riixaya Isdhexgal Ganacsi oo Qoto dheer oo ku Baahsan Bariga Afrika",
      excerpt:
        "Dowladaha xubnaha ah ayaa ka wada hadlaya inay hoos u dhigaan caqabadaha, waafajiyaan heerarka, oo fududeeyaan dhaqdhaqaaqa alaabta xudduudaha si ay u kordhiyaan ganacsiga gobolka gudihiisa.",
      body: [
        "Dowladaha ku baahsan Bariga Afrika ayaa hore u wadaya gorgortan lagu ujeedo inay qoto-dheereeyaan isdhexgalka dhaqaalaha, iyagoo raadinaya inay hoos u dhigaan cashuuraha, waafajiyaan heerarka badeecadaha, oo fududeeyaan dhaqdhaqaaqa alaabta xudduudahooda wadaagga ah. Taageerayaashu waxay ku doodaan in yaraynta cakanka ganacsiga gobolka ay furi karto koboc aan suuqyada qaranka ee gaarka ahi keligood gaari karin.",
        "Ganacsiga gobolka gudihiisa ee Bariga Afrika taariikh ahaan wuxuu ka dib maray qaybo kale oo adduunka, oo hor istaagay xeerar aan is-waafaqsanayn, hababka kastamka oo culus, iyo daldaloolo ku jira kaabayaasha gaadiidka. Baabuur sida alaab dhowr xudduud ah wuxuu wajahi karaa maalmo dib-udhac ah, taasoo ku darta kharash ugu dambeyntii ku dhaca macaamiisha iyo ganacsiyada.",
        "Riixiddu waxay la jaanqaadaysaa dadaal ballaadhan oo qaaradeed oo lagu dhisayo hal suuq oo Afrikaan ah, mashruuc muddo-dheer ah oo dhaqaaleyahano badani ay u arkaan mid lagama maarmaan u ah horumarka qaaradda. Isdhexgalka gobolka waxaa badanaa lagu tilmaamaa goob-tijaabo: haddii dowladaha deriska ah ay awoodaan inay waafajiyaan xeerarkooda oo ay isku kalsoonaadaan hay'adaha midba midka kale, aragtida ballaadhan ayaa noqoneysa mid la aamini karo.",
        "Haddana isdhexgalku waa mid siyaasad ahaan xasaasi ah. Dowladuhu waxay ka welwelsan yihiin ilaalinta warshadaha gudaha, luminta dakhliga cashuuraha, iyo ka-tanaasulka madaxbannaanida siyaasadda dhaqaalaha. Gorgortamayaashu waxay wajahayaan hawsha adag ee dheellitirka welwelkan iyo faa'iidooyinka wadajirka ah ee suuq weyn oo furan — dheellitir go'aamin doona inta iyo xawliga uu isdhexgalku ku socdo.",
      ],
    },
    ar: {
      title: "التكتل الإقليمي يدفع نحو تكامل تجاري أعمق في أنحاء شرق أفريقيا",
      excerpt:
        "تتفاوض الدول الأعضاء لخفض الحواجز وتنسيق المعايير وتسهيل حركة البضائع عبر الحدود في محاولة لتعزيز التجارة داخل المنطقة.",
      body: [
        "تمضي الحكومات في أنحاء شرق أفريقيا قدماً في مفاوضات تهدف إلى تعميق التكامل الاقتصادي، ساعيةً إلى خفض الرسوم الجمركية وتنسيق معايير المنتجات وتبسيط حركة البضائع عبر حدودها المشتركة. ويرى المؤيدون أن تقليل الاحتكاك في التجارة الإقليمية يمكن أن يطلق نمواً لا تستطيع الأسواق الوطنية الفردية تحقيقه وحدها.",
        "لطالما تخلّفت التجارة داخل منطقة شرق أفريقيا عن أجزاء أخرى من العالم، معوَّقةً بلوائح غير متسقة وإجراءات جمركية مرهقة وثغرات في البنية التحتية للنقل. فالشاحنة التي تحمل بضائع عبر عدة حدود قد تواجه أياماً من التأخير، ما يضيف تكلفة تقع في النهاية على المستهلكين والشركات.",
        "يتماشى هذا الدفع مع جهد قاري أوسع لبناء سوق أفريقية موحدة، وهو مشروع طويل الأمد يراه كثير من الاقتصاديين ضرورياً لتنمية القارة. وكثيراً ما يوصف التكامل الإقليمي بأنه ساحة اختبار: فإذا استطاعت الدول المتجاورة مواءمة قواعدها والثقة بمؤسسات بعضها البعض، أصبحت الرؤية الأوسع أكثر مصداقية.",
        "غير أن التكامل حساس سياسياً. فالحكومات تقلق بشأن حماية الصناعات المحلية، وفقدان إيرادات الرسوم الجمركية، والتنازل عن السيادة على السياسة الاقتصادية. ويواجه المفاوضون مهمة صعبة تتمثل في الموازنة بين هذه المخاوف والفوائد الجماعية لسوق أكبر وأكثر انفتاحاً — توازن سيحدد إلى أي مدى وبأي سرعة يمضي التكامل.",
      ],
    },
  },

  // ============ LOCAL NEWS 5 ============
  {
    categoryKey: "local-news",
    en: {
      title: "New Maternal Health Clinics Open in Underserved Somali Districts",
      excerpt:
        "A network of clinics focused on maternal and newborn care is expanding into rural areas, aiming to reduce one of the region's most persistent health challenges.",
      body: [
        "A series of new health clinics focused on maternal and newborn care has begun operating in rural districts, part of an effort to address one of Somalia's most persistent public-health challenges. Maternal mortality has long been among the highest in the world, driven by limited access to trained care, long distances to facilities, and shortages of equipment and staff.",
        "The new clinics aim to bring skilled birth attendance closer to communities that have historically had little access. Staffed by midwives and nurses and stocked with essential supplies, they focus on antenatal check-ups, safe delivery, and the critical hours after birth when many complications arise.",
        "Health workers emphasise that distance is often the deciding factor. A woman facing complications may live hours from the nearest facility, on roads that become impassable in the rainy season. Bringing care closer, they argue, can be the difference between a routine delivery and a preventable tragedy.",
        "Sustaining the clinics will require steady funding, trained personnel, and reliable supply chains — none of them guaranteed in a country facing competing demands on limited resources. But for the families they serve, the arrival of skilled care within reach marks a meaningful change in communities where childbirth has too often carried grave risk.",
      ],
    },
    so: {
      title: "Rugo Caafimaad oo Cusub oo Hooyada ah oo laga furay Degmooyinka Soomaaliyeed ee Adeeg-yari ah",
      excerpt:
        "Shabakad rugo caafimaad ah oo diiradda saaraysa daryeelka hooyada iyo dhallaanka cusub ayaa u fidaysa aagagga miyiga ah, iyadoo ujeeddadu tahay in la yareeyo mid ka mid ah caqabadaha caafimaad ee gobolka ugu adkaysi badan.",
      body: [
        "Rugo caafimaad oo cusub oo taxane ah oo diiradda saaraya daryeelka hooyada iyo dhallaanka cusub ayaa bilaabay inay ka shaqeeyaan degmooyinka miyiga ah, oo qayb ka ah dadaal lagu wajahayo mid ka mid ah caqabadaha caafimaadka guud ee Soomaaliya ugu adkaysi badan. Dhimashada hooyada muddo dheer waxay ka mid ahayd kuwa ugu sarreeya adduunka, oo ay kicisay helitaan xaddidan oo daryeel tababaran, masaafo dheer oo loo maro xarumaha, iyo yaraanta qalabka iyo shaqaalaha.",
        "Rugaha cusub waxay ujeeddadoodu tahay inay u soo dhoweeyaan daryeel-dhalmo xirfad leh bulshooyinka taariikh ahaan lahaa helitaan yar. Iyagoo ay ka shaqeeyaan umulisooyin iyo kalkaaliyeyaal oo ay ku kaydsan yihiin sahay muhiim ah, waxay diiradda saaraan baaritaanka uur-ka-hor, dhalmo ammaan ah, iyo saacadaha muhiimka ah ee dhalmada ka dib markii dhibaatooyin badani ay kacaan.",
        "Shaqaalaha caafimaadku waxay carrabka ku adkeeyaan in masaafadu ay inta badan tahay arrinta go'aaminaysa. Naag wajaheysa dhibaatooyin waxay ku noolaan kartaa saacado ka fog xarunta ugu dhow, waddooyin noqda kuwo aan la mari karin xilliga roobabka. Soo-dhoweynta daryeelka, waxay ku doodaan, waxay noqon kartaa farqiga u dhexeeya dhalmo caadi ah iyo musiibo laga hortagi karo.",
        "Sii-wadista rugaha waxay u baahan doontaa maalgelin joogto ah, shaqaale tababaran, iyo silsilado sahay oo la isku halleyn karo — mid koodna aan la dammaanad qaadin dal wajahaya baahiyo tartamaya oo lagu hayo kheyraad xaddidan. Laakiin qoysaska ay u adeegaan, imaatinka daryeel xirfad leh oo la gaari karo wuxuu calaamad u yahay isbeddel macno leh bulshooyinka ay dhalmadu inta badan khatar weyn ku qaaday.",
      ],
    },
    ar: {
      title: "عيادات جديدة لصحة الأمومة تُفتتح في مناطق صومالية محرومة من الخدمات",
      excerpt:
        "تتوسع شبكة من العيادات المركّزة على رعاية الأمومة والمواليد الجدد إلى المناطق الريفية، بهدف الحد من واحد من أكثر التحديات الصحية استمراراً في المنطقة.",
      body: [
        "بدأت سلسلة من العيادات الصحية الجديدة المركّزة على رعاية الأمومة والمواليد الجدد بالعمل في المناطق الريفية، ضمن جهد لمعالجة واحد من أكثر تحديات الصحة العامة استمراراً في الصومال. فقد ظلّت وفيات الأمهات طويلاً من بين الأعلى في العالم، مدفوعةً بمحدودية الوصول إلى رعاية مدرَّبة، وبُعد المسافات إلى المرافق، ونقص المعدات والكوادر.",
        "تهدف العيادات الجديدة إلى تقريب رعاية الولادة الماهرة من المجتمعات التي لم يكن لديها تاريخياً سوى وصول ضئيل. وبطاقم من القابلات والممرضات ومخزون من الإمدادات الأساسية، تركّز على فحوص ما قبل الولادة، والولادة الآمنة، والساعات الحرجة بعد الولادة حين تنشأ كثير من المضاعفات.",
        "يؤكد العاملون في المجال الصحي أن المسافة غالباً ما تكون العامل الحاسم. فالمرأة التي تواجه مضاعفات قد تعيش على بُعد ساعات من أقرب مرفق، على طرق تصبح غير سالكة في موسم الأمطار. وتقريب الرعاية، كما يقولون، قد يكون الفرق بين ولادة اعتيادية ومأساة يمكن الوقاية منها.",
        "سيتطلب استمرار العيادات تمويلاً ثابتاً، وكوادر مدرَّبة، وسلاسل إمداد موثوقة — ولا شيء منها مضمون في بلد يواجه مطالب متنافسة على موارد محدودة. لكن بالنسبة للأسر التي تخدمها، فإن وصول رعاية ماهرة في المتناول يمثّل تغييراً ذا معنى في مجتمعات طالما حملت فيها الولادة خطراً جسيماً.",
      ],
    },
  },

  // ============ TECHNOLOGY 6 ============
  {
    categoryKey: "technology",
    en: {
      title: "Digital Payment Startups Compete to Serve Somalia's Unbanked",
      excerpt:
        "A wave of fintech ventures is racing to offer savings, credit, and payment tools to millions who have long operated outside the formal banking system.",
      body: [
        "A new generation of financial-technology startups is competing to reach the millions of Somalis who have historically operated outside the formal banking system. Building on the country's widespread adoption of mobile money, these ventures are experimenting with savings products, small-scale credit, and payment tools designed for a largely cash-and-mobile economy.",
        "Somalia offers unusual conditions for fintech. Decades without a fully functioning traditional banking sector pushed both consumers and businesses toward mobile-based alternatives, giving the country one of the highest rates of mobile-money use in the world. For startups, that means a population already comfortable with digital transactions.",
        "The opportunities come with real challenges. Extending credit requires ways to assess risk in an economy with little formal financial history. Regulation is still developing, and questions of consumer protection, data privacy, and fraud loom large as services scale. Trust, hard-won and easily lost, is the currency these companies most depend on.",
        "Whether the current wave produces durable institutions or a shakeout of competing apps remains to be seen. But the direction is clear: financial services in Somalia are being reimagined for mobile-first users, and the companies that solve for trust and reliability may help bring millions more fully into the formal economy.",
      ],
    },
    so: {
      title: "Startup-yada Lacag-bixinta Dijitaalka ah oo u Tartamaya inay u Adeegaan Soomaalida aan Bangiga Lahayn",
      excerpt:
        "Mowjad ka mid ah shirkadaha fintech ah ayaa u tartamaysa inay bixiyaan kaydin, deyn, iyo qalab lacag-bixineed oo loogu talagalay malaayiin muddo dheer ka shaqeeyay nidaamka bangiyada rasmiga ah dibaddiisa.",
      body: [
        "Jiil cusub oo startup-yo teknoolajiyada maaliyadeed ah ayaa u tartamaya inay gaaraan malaayiinta Soomaalida ah ee taariikh ahaan ka shaqeeyay nidaamka bangiyada rasmiga ah dibaddiisa. Iyagoo ku dhisaya qaadashada baahsan ee dalka ee lacagta mobaylka, shirkadahani waxay tijaabinayaan alaab kaydineed, deyn yar-yar, iyo qalab lacag-bixineed oo loogu talagalay dhaqaale inta badan ah lacag-caddaan iyo mobayl.",
        "Soomaaliya waxay bixisaa xaalado aan caadi ahayn oo loogu talagalay fintech-ka. Tobannaan sano oo aan la lahayn qayb bangi oo dhab ah oo si buuxda u shaqeynaysa ayaa u riixday macaamiisha iyo ganacsiyadaba xulasho mobayl ku saleysan, taasoo dalka siisay mid ka mid ah heerarka ugu sarreeya ee isticmaalka lacagta mobaylka adduunka. Startup-yada, taasi waxay ka dhigan tahay dad mar hore la qabsaday macaamil dijitaal ah.",
        "Fursaduhu waxay la yimaadaan caqabado dhab ah. Fidinta deynta waxay u baahan tahay siyaabo lagu qiimeeyo khatarta dhaqaale ay yar tahay taariikh maaliyadeed rasmi ah. Sharcigu weli wuu soo koraya, su'aalaha ilaalinta macaamiisha, sirta xogta, iyo khiyaanada ayaa weyn markii adeegyadu balaadhaan. Kalsoonida, oo si adag loo helo oo si fudud loo lumiyo, waa lacagta ay shirkadahani ugu tiirsan yihiin.",
        "In mowjadda hadda jirtaa ay soo saarto hay'ado waara iyo in kale ama iska-dhac ab-abyo tartamaya ayaa weli la arki doonaa. Laakiin jihadu waa cad: adeegyada maaliyadeed ee Soomaaliya waxaa dib loogu qiyaasayaa isticmaaleyaasha mobayl-hore, shirkadaha xalliya kalsoonida iyo la-isku-halleynta ayaa laga yaabaa inay gacan ka geystaan inay malaayiin dheeraad ah si buuxda u soo geliyaan dhaqaalaha rasmiga ah.",
      ],
    },
    ar: {
      title: "شركات المدفوعات الرقمية الناشئة تتنافس لخدمة الصوماليين غير المتعاملين مع المصارف",
      excerpt:
        "موجة من المشاريع في التقنية المالية تتسابق لتقديم أدوات الادخار والائتمان والدفع لملايين ظلّوا طويلاً يعملون خارج النظام المصرفي الرسمي.",
      body: [
        "يتنافس جيل جديد من الشركات الناشئة في مجال التقنية المالية للوصول إلى ملايين الصوماليين الذين عملوا تاريخياً خارج النظام المصرفي الرسمي. وبالبناء على انتشار اعتماد البلاد على الأموال عبر الهاتف، تجرّب هذه المشاريع منتجات ادخار وائتماناً صغير الحجم وأدوات دفع مصممة لاقتصاد يقوم إلى حد كبير على النقد والهاتف.",
        "يوفّر الصومال ظروفاً غير عادية للتقنية المالية. فعقود من دون قطاع مصرفي تقليدي يعمل بكامل طاقته دفعت المستهلكين والشركات نحو بدائل قائمة على الهاتف، ما منح البلاد أحد أعلى معدلات استخدام الأموال عبر الهاتف في العالم. وبالنسبة للشركات الناشئة، يعني ذلك وجود سكان مرتاحين أصلاً للمعاملات الرقمية.",
        "تأتي الفرص مع تحديات حقيقية. فتقديم الائتمان يتطلب طرقاً لتقييم المخاطر في اقتصاد ذي تاريخ مالي رسمي ضئيل. ولا يزال التنظيم في طور التطور، وتلوح مسائل حماية المستهلك وخصوصية البيانات والاحتيال بقوة مع توسّع الخدمات. والثقة، التي تُكتسب بصعوبة وتُفقد بسهولة، هي العملة التي تعتمد عليها هذه الشركات أكثر من غيرها.",
        "ويبقى أن نرى ما إذا كانت الموجة الحالية ستنتج مؤسسات دائمة أم تصفية لتطبيقات متنافسة. لكن الاتجاه واضح: يُعاد تصور الخدمات المالية في الصومال لمستخدمين يعتمدون الهاتف أولاً، والشركات التي تحل مسألتَي الثقة والموثوقية قد تساعد في إدخال ملايين آخرين إلى الاقتصاد الرسمي بشكل أكمل.",
      ],
    },
  },

  // ============ INTERNATIONAL (politics) 6 ============
  {
    categoryKey: "politics",
    en: {
      title: "Diplomatic Push Seeks to Ease Tensions Over Red Sea Shipping Routes",
      excerpt:
        "International mediators are working to reduce disruptions to one of the world's busiest maritime corridors, where instability has rattled global trade.",
      body: [
        "Diplomatic efforts are under way to ease tensions surrounding the Red Sea, one of the world's most important shipping corridors, where disruptions have sent ripples through global trade. The narrow waterway carries a substantial share of international commerce between Europe, Asia, and beyond, making its stability a matter of worldwide concern.",
        "Disruptions to Red Sea traffic force vessels to reroute around the southern tip of Africa, adding thousands of miles, days of transit time, and significant cost to journeys. Those added expenses ripple outward, raising shipping rates and contributing to price pressures on goods far from the region itself.",
        "For countries along the Horn of Africa, the corridor's stability carries particular weight. The region sits astride vital sea lanes, and instability at sea intersects with security and economic interests on land. Governments in the area have a direct stake in seeing safe passage restored.",
        "Mediators face a complex web of actors and grievances, and analysts caution against expecting a quick resolution. Yet the shared economic interest in open, secure shipping lanes gives many parties reason to seek de-escalation. How successfully that interest can be translated into stability will shape trade and security well beyond the waterway's shores.",
      ],
    },
    so: {
      title: "Dadaal Diblomaasiyadeed oo Doonaya inuu Dejiyo Xiisadda ku saabsan Marinnada Maraakiibta Badda Cas",
      excerpt:
        "Dhexdhexaadiyeyaal caalami ah ayaa ka shaqeynaya inay yareeyaan carqaladaha ku yimaadda mid ka mid ah marinnada badeed ee adduunka ugu mashquulka badan, halkaas oo xasillooni-darradu ay gilgishay ganacsiga caalamiga ah.",
      body: [
        "Dadaallo diblomaasiyadeed ayaa socda si loo dejiyo xiisadaha ku xeeran Badda Cas, oo ah mid ka mid ah marinnada maraakiibta ugu muhiimsan adduunka, halkaas oo carqaladuhu ay mowjado u direen ganacsiga caalamiga ah. Marinka cidhiidhiga ah wuxuu qaadaa qayb weyn oo ganacsiga caalamiga ah oo u dhexeeya Yurub, Aasiya, iyo wixii ka baxsan, taasoo xasilloonidiisa ka dhigaysa arrin caalamka oo dhan khuseysa.",
        "Carqaladaha ku yimaadda socodka Badda Cas waxay ku qasbaan maraakiibta inay mareen agagaarka cirifka koonfureed ee Afrika, iyagoo ku daraya kumannaan mayl, maalmo waqti-gudub ah, iyo kharash weyn safarrada. Kharashyadaas dheeraadka ah waxay mowjad u baxaan dibadda, iyagoo kor u qaadaya heerarka maraakiibta oo gacan ka geysanaya cadaadis qiimo oo saameeya badeecado ka fog gobolka lafteeda.",
        "Dalalka ku yaal Geeska Afrika, xasilloonida marinku waxay leedahay culeys gaar ah. Gobolku wuxuu ku fadhiyaa marinno badeed oo muhiim ah, xasillooni-darrada baddana waxay is-dhaafsataa amni iyo danaha dhaqaale ee dhulka. Dowladaha aaggu waxay si toos ah dan uga leeyihiin inay arkaan in marin ammaan ah la soo celiyo.",
        "Dhexdhexaadiyeyaashu waxay wajahayaan shabakad adag oo qofaf iyo cabashooyin ah, falanqeeyayaashuna waxay ka digayaan in la filo xal degdeg ah. Haddana danta dhaqaale ee wadaagga ah ee marinno maraakiib oo furan oo ammaan ah waxay dhinacyo badan siisaa sabab ay ku raadiyaan dejin. Sida guul leh ee dantaas loogu turjumi karo xasillooni ayaa qaabeyn doonta ganacsiga iyo amniga si aad uga baxsan xeebaha marinka.",
      ],
    },
    ar: {
      title: "تحرك دبلوماسي يسعى لتهدئة التوترات حول طرق الشحن في البحر الأحمر",
      excerpt:
        "يعمل وسطاء دوليون على تقليل الاضطرابات في واحد من أكثر الممرات البحرية ازدحاماً في العالم، حيث زعزع عدم الاستقرار التجارة العالمية.",
      body: [
        "تجري جهود دبلوماسية لتهدئة التوترات المحيطة بالبحر الأحمر، أحد أهم ممرات الشحن في العالم، حيث أرسلت الاضطرابات موجات عبر التجارة العالمية. فالممر المائي الضيق يحمل حصة كبيرة من التجارة الدولية بين أوروبا وآسيا وما وراءهما، ما يجعل استقراره مصدر قلق عالمي.",
        "تُجبر الاضطرابات في حركة البحر الأحمر السفن على تغيير مسارها حول الطرف الجنوبي لأفريقيا، ما يضيف آلاف الأميال وأياماً من وقت العبور وتكلفة كبيرة للرحلات. وتنتشر تلك النفقات الإضافية إلى الخارج، فترفع أسعار الشحن وتسهم في ضغوط الأسعار على بضائع بعيدة عن المنطقة نفسها.",
        "بالنسبة لدول القرن الأفريقي، يحمل استقرار الممر وزناً خاصاً. فالمنطقة تقع على مقربة من ممرات بحرية حيوية، ويتقاطع عدم الاستقرار في البحر مع مصالح أمنية واقتصادية على البر. وللحكومات في المنطقة مصلحة مباشرة في رؤية العبور الآمن يُستعاد.",
        "يواجه الوسطاء شبكة معقدة من الأطراف والمظالم، ويحذّر المحللون من توقع حل سريع. ومع ذلك، فإن المصلحة الاقتصادية المشتركة في ممرات شحن مفتوحة وآمنة تمنح أطرافاً كثيرة سبباً للسعي إلى التهدئة. وكيفية ترجمة تلك المصلحة بنجاح إلى استقرار ستشكّل التجارة والأمن إلى ما هو أبعد من شواطئ الممر المائي.",
      ],
    },
  },

  // ============ LOCAL NEWS 6 ============
  {
    categoryKey: "local-news",
    en: {
      title: "Solar Power Brings Electricity to Rural Somali Villages for the First Time",
      excerpt:
        "Off-grid solar installations are lighting homes, powering small businesses, and charging phones in communities that have never been connected to a central grid.",
      body: [
        "In villages across rural Somalia, solar power is bringing electricity to homes that have never been connected to any central grid. Small-scale installations — rooftop panels, shared micro-grids, and pay-as-you-go home systems — are lighting houses after dark, powering small businesses, and letting residents charge phones without long journeys to distant towns.",
        "The appeal of solar is practical. Somalia has abundant sunshine, and building conventional grid infrastructure across a vast, dispersed, and often insecure territory is slow and expensive. Distributed solar sidesteps that problem, delivering power village by village and household by household without waiting for national infrastructure.",
        "The effects reach beyond convenience. Reliable light extends the hours available for study and work. Refrigeration becomes possible for food and medicine. Phone charging keeps families connected to relatives, markets, and mobile-money services that have become central to daily economic life.",
        "Barriers persist, chiefly the upfront cost of equipment and the challenge of maintenance and repair in remote areas. Pay-as-you-go financing models have helped lower the initial hurdle for many households. For communities long left in the dark, the arrival of even modest, reliable power marks a quiet but significant step forward.",
      ],
    },
    so: {
      title: "Tamarta Qorraxda oo Koronto u Keentay Tuulooyinka Miyiga Soomaaliyeed Markii ugu Horreysay",
      excerpt:
        "Rakibaadyada qorraxda ee ka baxsan shabakadda ayaa iftiiminaya guryaha, ku shaqeynaya ganacsiyada yaryar, oo dallacaya telefoonnada bulshooyinka aan waligood ku xirmin shabakad dhexe.",
      body: [
        "Tuulooyinka ku baahsan miyiga Soomaaliya, tamarta qorraxda ayaa koronto u keenaysa guryaha aan waligood ku xirmin shabakad dhexe. Rakibaadyo yaryar — alwaax saqafka ah, micro-grids la wadaago, iyo nidaamyo guri oo bixi-markaad-isticmaasho — ayaa iftiiminaya guryaha mugdiga ka dib, ku shaqeynaya ganacsiyada yaryar, oo u oggolaanaya dadka deggan inay dallacaan telefoonnada iyagoon safar dheer ku tegin magaalooyin fog.",
        "Soo-jiidashada qorraxdu waa mid wax-ku-ool ah. Soomaaliya waxay leedahay qorrax badan, dhisidda kaabayaasha shabakadda caadiga ah ee dhul ballaadhan, kala firidhsan, oo inta badan aan ammaan ahayn waa mid gaabis ah oo qaali ah. Qorraxda la qeybiyay ayaa ka gudubta dhibaatadaas, iyadoo koronto u keenaysa tuulo-tuulo iyo guri-guri iyadoon la sugin kaabayaasha qaranka.",
        "Saameynta ayaa ka gudubta habboonaanta. Iftiin la isku halleyn karo wuxuu kordhiyaa saacadaha loo heli karo waxbarashada iyo shaqada. Qaboojintu waxay suurtogal u noqotaa cuntada iyo daawada. Dallacaadda telefoonku waxay qoysaska ku xiraa qaraabada, suuqyada, iyo adeegyada lacagta mobaylka ee noqday kuwo udub-dhexaad u ah nolosha dhaqaale ee maalinlaha ah.",
        "Caqabado ayaa sii jira, gaar ahaan kharashka hore ee qalabka iyo caqabadda dayactirka iyo hagaajinta meelaha fog. Moodooyinka maalgelinta bixi-markaad-isticmaasho ayaa gacan ka geystay hoos-u-dhigidda caqabadda hore ee qoysas badan. Bulshooyinka muddo dheer mugdiga looga tagay, imaatinka koronto xitaa yar oo la isku halleyn karo wuxuu calaamad u yahay tallaabo aamusan laakiin muhiim ah oo hore loo qaaday.",
      ],
    },
    ar: {
      title: "الطاقة الشمسية تجلب الكهرباء إلى القرى الصومالية الريفية للمرة الأولى",
      excerpt:
        "منشآت الطاقة الشمسية خارج الشبكة تضيء المنازل وتشغّل الأعمال الصغيرة وتشحن الهواتف في مجتمعات لم تتصل قط بشبكة مركزية.",
      body: [
        "في القرى في أنحاء الريف الصومالي، تجلب الطاقة الشمسية الكهرباء إلى منازل لم تتصل قط بأي شبكة مركزية. فالمنشآت الصغيرة — ألواح على الأسطح، وشبكات صغيرة مشتركة، وأنظمة منزلية بنظام الدفع حسب الاستخدام — تضيء البيوت بعد حلول الظلام، وتشغّل الأعمال الصغيرة، وتتيح للسكان شحن هواتفهم من دون رحلات طويلة إلى بلدات بعيدة.",
        "جاذبية الطاقة الشمسية عملية. فالصومال يتمتع بوفرة من أشعة الشمس، وبناء بنية تحتية تقليدية للشبكة عبر إقليم شاسع ومتفرق وغالباً غير آمن بطيء ومكلف. والطاقة الشمسية الموزّعة تتجاوز تلك المشكلة، إذ توصّل الكهرباء قرية بقرية وأسرة بأسرة من دون انتظار البنية التحتية الوطنية.",
        "تتجاوز الآثار مجرد الراحة. فالضوء الموثوق يمدّد الساعات المتاحة للدراسة والعمل. ويصبح التبريد ممكناً للطعام والدواء. ويُبقي شحن الهاتف الأسر على تواصل مع الأقارب والأسواق وخدمات الأموال عبر الهاتف التي باتت محورية في الحياة الاقتصادية اليومية.",
        "تبقى العوائق قائمة، وأبرزها التكلفة الأولية للمعدات وتحدي الصيانة والإصلاح في المناطق النائية. وقد ساعدت نماذج التمويل بنظام الدفع حسب الاستخدام في خفض العقبة الأولى لكثير من الأسر. وبالنسبة لمجتمعات تُركت طويلاً في الظلام، يمثّل وصول طاقة موثوقة ولو متواضعة خطوة هادئة لكن مهمة إلى الأمام.",
      ],
    },
  },

  // ============ TECHNOLOGY 7 ============
  {
    categoryKey: "technology",
    en: {
      title: "AI Translation Tools Open New Doors — and Raise Questions — for Somali Speakers",
      excerpt:
        "Advances in machine translation are making the Somali language more accessible online, but researchers warn that low-resource languages still lag far behind.",
      body: [
        "Recent advances in artificial-intelligence translation are beginning to make the Somali language more accessible in digital spaces, offering the prospect of easier access to information, education, and services for tens of millions of speakers. Yet researchers caution that Somali, like many languages spoken across Africa, remains a low-resource language for which these tools work far less reliably than for widely-documented ones.",
        "The core problem is data. Modern translation systems learn from vast quantities of text, and languages with abundant digital material online produce far better results. Somali, despite its many speakers, has a comparatively small digital footprint, which limits the quality of automated translation and can introduce errors that range from awkward to seriously misleading.",
        "Efforts to close the gap are under way. Academic projects, open-source collaborations, and community-driven data collection aim to expand the digital resources available for Somali and other underrepresented languages. Advocates argue that language inclusion in AI is not a niche concern but a question of who gets to participate fully in an increasingly digital world.",
        "The stakes are significant. As more services — from government information to healthcare guidance — move online and lean on automated language tools, the quality of translation shapes who can access them. For Somali speakers, better tools could mean broader access; poor ones could deepen exclusion. The technology's promise, researchers say, depends on the investment made in the languages it serves.",
      ],
    },
    so: {
      title: "Qalabka Turjumaadda AI-ga oo Albaabbo Cusub u Furaya — una Kiciya Su'aalo — Ku-hadlayaasha Soomaaliga",
      excerpt:
        "Horumarka turjumaadda mashiinku wuxuu ka dhigayaa afka Soomaaliga mid si fudud online loo heli karo, laakiin cilmi-baarayaashu waxay ka digayaan in afafka kheyraadka-yar ay weli si aad ah uga dib maraan.",
      body: [
        "Horumarrada dhawaan ka jira turjumaadda sirdoonka macmalka ah ayaa bilaabaya inay ka dhigaan afka Soomaaliga mid si fudud loo heli karo goobaha dijitaalka ah, iyagoo bixinaya rajada helitaan fudud oo macluumaad, waxbarasho, iyo adeegyo tobannaan malaayiin ku-hadal ah. Haddana cilmi-baarayaashu waxay ka digayaan in Soomaaligu, sida afaf badan oo lagaga hadlo Afrika, uu weli yahay af kheyraad-yar oo qalabkani ay uga shaqeeyaan si aad uga yar la-isku-halleynta kuwa si ballaadhan loo diiwaangeliyay.",
        "Dhibaatada udub-dhexaadka ah waa xogta. Nidaamyada turjumaadda casriga ah waxay wax ka bartaan tiro aad u badan oo qoraal ah, afafka leh alaab dijitaal ah oo badan online ayaa soo saara natiijooyin aad u fiican. Soomaaliga, inkastoo ay badan yihiin ku-hadalyadiisu, wuxuu leeyahay raad dijitaal ah oo si isbarbardhig ah u yar, taasoo xaddidaysa tayada turjumaadda otomaatiga ah oo soo geli karta khaladaad u dhexeeya kuwo aan habboonayn ilaa kuwo si daran u marin-habaabinaya.",
        "Dadaallo lagu xirayo farqiga ayaa socda. Mashaariic tacliimeed, iskaashi open-source ah, iyo ururinta xogta ee bulshadu wado ayaa ujeeddadoodu tahay inay balaadhiyaan kheyraadka dijitaalka ah ee loo heli karo Soomaaliga iyo afafka kale ee aan si buuxda loo matalin. U-doodayaashu waxay ku doodaan in ku-darsiga afafka ee AI-ga uusan ahayn welwel gaar ah laakiin su'aal ku saabsan cidda si buuxda uga qeyb qaadan karta adduun sii dijitaalaya.",
        "Khatartu waa mid weyn. Marka adeegyo badan — laga bilaabo macluumaadka dowladda ilaa hagitaanka caafimaadka — ay online u guuraan oo ay ku tiirsadaan qalab af otomaatig ah, tayada turjumaaddu waxay qaabeysaa cidda heli karta. Ku-hadlayaasha Soomaaliga, qalab wanaagsan wuxuu la macno noqon karaa helitaan ballaadhan; kuwa liita waxay sii xoojin karaan ka-saarid. Ballanqaadka teknoolajiyada, cilmi-baarayaashu waxay yiraahdeen, wuxuu ku xiran yahay maalgelinta lagu sameeyo afafka uu u adeego.",
      ],
    },
    ar: {
      title: "أدوات الترجمة بالذكاء الاصطناعي تفتح أبواباً جديدة — وتثير أسئلة — للناطقين بالصومالية",
      excerpt:
        "تجعل التطورات في الترجمة الآلية اللغة الصومالية أكثر إتاحةً على الإنترنت، لكن الباحثين يحذّرون من أن اللغات محدودة الموارد لا تزال متأخرة كثيراً.",
      body: [
        "بدأت التطورات الأخيرة في الترجمة بالذكاء الاصطناعي تجعل اللغة الصومالية أكثر إتاحةً في الفضاءات الرقمية، ما يوفّر احتمال وصول أسهل إلى المعلومات والتعليم والخدمات لعشرات الملايين من الناطقين بها. ومع ذلك، يحذّر الباحثون من أن الصومالية، مثل لغات كثيرة يُتحدث بها في أنحاء أفريقيا، تبقى لغة محدودة الموارد تعمل هذه الأدوات معها بموثوقية أقل بكثير منها مع اللغات الموثّقة على نطاق واسع.",
        "المشكلة الجوهرية هي البيانات. فأنظمة الترجمة الحديثة تتعلم من كميات هائلة من النصوص، واللغات ذات المواد الرقمية الوفيرة على الإنترنت تنتج نتائج أفضل بكثير. والصومالية، رغم كثرة الناطقين بها، لها بصمة رقمية صغيرة نسبياً، ما يحد من جودة الترجمة الآلية وقد يُدخل أخطاء تتراوح بين المربكة والمضللة بشكل خطير.",
        "تجري جهود لسد الفجوة. فالمشاريع الأكاديمية، والتعاونات مفتوحة المصدر، وجمع البيانات الذي يقوده المجتمع تهدف إلى توسيع الموارد الرقمية المتاحة للصومالية وغيرها من اللغات الممثَّلة تمثيلاً ناقصاً. ويرى المدافعون أن إدماج اللغات في الذكاء الاصطناعي ليس شأناً هامشياً بل مسألة تتعلق بمن يستطيع المشاركة الكاملة في عالم يزداد رقمنة.",
        "المخاطر كبيرة. فمع انتقال المزيد من الخدمات — من معلومات الحكومة إلى الإرشادات الصحية — إلى الإنترنت واعتمادها على أدوات لغوية آلية، تشكّل جودة الترجمة من يستطيع الوصول إليها. وبالنسبة للناطقين بالصومالية، قد تعني الأدوات الأفضل وصولاً أوسع؛ والرديئة قد تعمّق الإقصاء. ووعد التكنولوجيا، كما يقول الباحثون، يعتمد على الاستثمار المبذول في اللغات التي تخدمها.",
      ],
    },
  },

  // ============ INTERNATIONAL (politics) 7 ============
  {
    categoryKey: "politics",
    en: {
      title: "United Nations Warns of Widening Humanitarian Funding Shortfall",
      excerpt:
        "Aid agencies say a growing gap between needs and available funding is forcing painful choices, as crises multiply faster than donations can keep pace.",
      body: [
        "The United Nations and partner aid organisations have warned of a widening gap between humanitarian needs worldwide and the funding available to meet them. As conflicts, climate shocks, and displacement multiply across multiple regions, agencies say donations are failing to keep pace, forcing difficult decisions about who receives help and who goes without.",
        "The shortfall has real consequences on the ground. Underfunded programmes have been forced to cut food rations, scale back medical services, and suspend support to some of the world's most vulnerable populations. Aid workers describe the painful arithmetic of rationing limited resources across needs that all appear urgent.",
        "Several factors are converging. The number and severity of simultaneous crises has grown, while some traditional donor governments face budget pressures at home and shifting political priorities. The result is that appeals routinely close each year having raised only a fraction of what agencies say is required.",
        "Humanitarian leaders have urged both a broadening of the donor base and greater investment in prevention and resilience, arguing that early action costs far less than emergency response. For the communities affected, however, the immediate reality is stark: as needs rise and funding lags, the margin between survival and catastrophe grows thinner.",
      ],
    },
    so: {
      title: "Qaramada Midoobay oo ka Digtay Yaraansho Maalgelin Bini'aadantinimo oo sii Ballaadhaneysa",
      excerpt:
        "Hay'adaha gargaarku waxay sheegayaan in farqi sii kordheysa oo u dhexeeya baahida iyo maalgelinta la heli karo uu ku qasbayo doorasho xanuun badan, iyadoo qalalaasyadu ay ku badanayaan si ka dhaqso badan inta deeqahu ay la socon karaan.",
      body: [
        "Qaramada Midoobay iyo hay'adaha gargaarka ee la-shaqeeyayaasha ah ayaa ka digay farqi sii ballaadhanaya oo u dhexeeya baahiyaha bini'aadantinimo ee adduunka oo dhan iyo maalgelinta loo heli karo si loo daboolo. Iyadoo colaadaha, naxdinta cimilada, iyo barakaca ay ku badanayaan gobollo badan, hay'aduhu waxay sheegayaan in deeqahu ay ku guuldareysanayaan inay la socdaan, taasoo ku qasbeysa go'aanno adag oo ku saabsan cidda gargaar hesha iyo cidda la'aan ah.",
        "Yaraanshuhu wuxuu leeyahay cawaaqib dhab ah oo dhulka ah. Barnaamijyada aan si buuxda loo maalgelin ayaa lagu qasbay inay yareeyaan qaybaha cuntada, hoos u dhigaan adeegyada caafimaadka, oo hakiyaan taageerada qaar ka mid ah dadka adduunka ugu nugul. Shaqaalaha gargaarku waxay tilmaamaan xisaabta xanuunka badan ee qaybinta kheyraad xaddidan oo dhammaan baahiyo u muuqda kuwo degdeg ah.",
        "Dhowr arrimood ayaa isku dhacaya. Tirada iyo darnaanta qalalaasyada isku mar ah ayaa kordhay, halka qaar ka mid ah dowladaha deeq-bixiyeyaasha dhaqameed ay wajahaan cadaadis miisaaniyadeed guriga iyo mudnaanta siyaasadeed oo isbeddeleysa. Natiijadu waxay tahay in codsiyada si joogto ah ay xiraan sannad kasta iyagoo kaliya ururiyay qayb yar oo ka mid ah waxa hay'aduhu sheegaan in loo baahan yahay.",
        "Hoggaamiyeyaasha bini'aadantinimadu waxay ku booriyeen ballaadhinta saldhigga deeq-bixiyeyaasha iyo maalgelin dheeraad ah oo lagu sameeyo ka-hortagga iyo adkaysiga, iyagoo ku dooday in tallaabo hore ay ku kacdo wax aad uga yar jawaabta degdegga ah. Bulshooyinka la saameeyay, si kastaba ha ahaatee, xaqiiqada degdegga ah waa mid adag: marka baahidu kor u kacdo maalgelintuna ay ka dib maraan, xudduudka u dhexeeya badbaadada iyo masiibada ayaa sii khafiifaya.",
      ],
    },
    ar: {
      title: "الأمم المتحدة تحذّر من اتساع العجز في التمويل الإنساني",
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

  // ============ TECHNOLOGY 8 ============
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

  // ============ INTERNATIONAL (politics) 8 ============
  {
    categoryKey: "politics",
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

  // ============ TECHNOLOGY 9 ============
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

  // ============ LOCAL NEWS 8 ============
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

/** Build one locale's translation payload for a given loop copy. */
function buildTranslation(
  locale: Locale,
  content: LocalizedContent,
  baseSlug: string,
  copyIndex: number,
) {
  const suffix = copyIndex === 0 ? "" : ` (${copyIndex + 1})`;
  const slugSuffix = `-${copyIndex + 1}`;
  const contentText = content.body.join("\n\n");
  return {
    locale,
    title: `${content.title}${suffix}`,
    // Slug always carries the copy index so (slug, locale) is unique.
    slug: `${baseSlug}${slugSuffix}`,
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

  // 10 copies of each of the 9 source articles → 90 total.
  for (let copy = 0; copy < 1; copy++) {
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
          coverImageId: cover.id, // <-- Replaced the broken nested create with this
          translations: {
            create: [
              buildTranslation(Locale.en, article.en, baseSlugEn, copy),
              buildTranslation(Locale.so, article.so, baseSlugSo, copy),
              buildTranslation(Locale.ar, article.ar, baseSlugAr, copy),
            ],
          },
        },
      });
      n++;
    }
  }
  console.log(`  articles: ${n} created (9 sources × 10 copies)`);
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
