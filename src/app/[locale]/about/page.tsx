import type { Metadata } from "next";
import { getDictionary, type AppLocale } from "@/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale as AppLocale);
  const title = `${dict.nav?.about ?? "About Us"} — ${dict.site.name}`;
  const description =
    "Independent journalism on Somalia and the Horn of Africa: politics, regional developments, and technology.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

// A small presentational helper keeps the three sections consistent
// without reaching for borders or dividers.
function Section({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sage">
        {kicker}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">
        {title}
      </h2>
      <div className="prose-reading mt-4 max-w-none space-y-4">{children}</div>
    </section>
  );
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const appLocale = locale as AppLocale;
  const dict = await getDictionary(appLocale);

  return (
    <div className="mx-auto max-w-3xl py-6">
      {/* Masthead */}
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          {dict.site.name}
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
          Journalism for Somalia and the Horn of Africa
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          We are an independent newsroom covering the politics, regional
          dynamics, and emerging technology shaping Somalia and its
          neighbours — reporting with rigour, context, and a commitment to
          the communities we serve.
        </p>
      </header>

      {/* A calm lifted panel holds the body copy, separating it from the
          masthead by surface contrast rather than a rule. */}
      <div className="mt-10 rounded-3xl bg-surface px-7 py-9 shadow-soft sm:px-10 sm:py-11">
        <Section kicker="Our Mission" title="Independent, in-depth reporting">
          <p>
            Our mission is to deliver high-quality, independent journalism
            about a region too often reduced to headlines about conflict and
            crisis. Somalia and the wider Horn of Africa are shaped by
            complex politics, resilient communities, and rapid technological
            change — and they deserve coverage that reflects that
            complexity.
          </p>
          <p>
            We report on the institutions and decisions that affect people&apos;s
            lives: the negotiations over Somalia&apos;s electoral future, the
            shifting relationships between the federal government and member
            states, the regional forces that shape security, and the
            innovations changing how millions live and work. We aim to
            explain not just what happened, but why it matters.
          </p>
        </Section>

        <Section kicker="Editorial Standards" title="Accuracy, fairness, independence">
          <p>
            We hold ourselves to clear editorial standards. We verify before
            we publish, attribute our sources, and correct our mistakes
            openly. We distinguish reporting from analysis and opinion, and
            we label each clearly so readers always know what they are
            reading.
          </p>
          <p>
            We are independent. Our editorial decisions are not dictated by
            any government, party, or commercial interest. We strive for
            fairness by seeking multiple perspectives on contested issues and
            giving those we report on a genuine opportunity to respond. Where
            facts are disputed or uncertain, we say so plainly rather than
            forcing false certainty.
          </p>
          <p>
            We publish in English, Somali, and Arabic because the
            region&apos;s stories belong to the people who live them, in the
            languages they speak.
          </p>
        </Section>

        <Section kicker="Our Coverage" title="Politics, region, and technology">
          <p>
            <strong className="font-semibold text-ink">Politics.</strong>{" "}
            We track the federal government, the member states, parliament,
            and the opposition — from constitutional reform and the road to
            direct elections to the everyday workings of governance and
            accountability.
          </p>
          <p>
            <strong className="font-semibold text-ink">
              Regional developments.
            </strong>{" "}
            The Horn of Africa is deeply interconnected. We cover security,
            diplomacy, humanitarian pressures, and the relationships that
            bind Somalia to its neighbours and to the wider world.
          </p>
          <p>
            <strong className="font-semibold text-ink">Technology.</strong>{" "}
            From nationwide satellite internet to one of the world&apos;s most
            advanced mobile-money ecosystems, technology is reshaping the
            region. We report on the infrastructure, the innovators, and the
            people being connected — and on those still left behind.
          </p>
        </Section>
      </div>

      {/* Closing note, separated by whitespace alone. */}
      <p className="mt-10 text-center text-sm text-ink-muted">
        Have a story, a tip, or a correction?{" "}
        <a
          href={`/${appLocale}/contact`}
          className="font-medium text-sage underline-offset-4 hover:underline"
        >
          Get in touch with our newsroom
        </a>
        .
      </p>
    </div>
  );
}
