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
  // The first admin you'll log in with. Override the password via the
  // ADMIN_PASSWORD env var; otherwise a default is used (change it
  // immediately after first login).
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
  // Byline authors for the seeded articles. These also get a password
  // (same default) so you can log in as any role while testing.
  const passwordHash = await bcrypt.hash(
    process.env.SEED_PASSWORD ?? "ChangeMe123!",
    12,
  );
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
        isActive: true,
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
  for (let copy = 0; copy < 10; copy++) {
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
 
      // Create the cover Media FIRST, then reference it by id. The
      // Article→Media relation is defined on Article (coverImageId),
      // and Media.uploaderId is required, so a media-first create is
      // the unambiguous way to satisfy both. storageKey is unique, so
      // it includes the global counter n to avoid collisions across
      // the 90 rows.
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
          coverImageId: cover.id, // scalar FK, matches your schema
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
 