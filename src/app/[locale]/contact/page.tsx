import type { Metadata } from "next";
import { MapPin, Mail, Phone, Newspaper } from "lucide-react";
import { getDictionary, type AppLocale } from "@/i18n";
import { ContactForm } from "@/components/contact/contact-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale as AppLocale);
 const title = `${(dict.nav as Record<string, string | undefined>)?.contact ?? "Contact"} — ${dict.site.name}`;
  const description =
    "Contact our Lower Shabelle Media — story tips, corrections, and general inquiries for Somalia and the Horn of Africa.";
  return { title, description, openGraph: { title, description } };
}

// Dummy contact details. Swap these for real values when available.
const CONTACTS = [
  {
    icon: MapPin,
    tint: "bg-sage-soft text-sage",
    label: "Mogadishu Bureau",
    lines: ["Maka Al-Mukarama Road", "Hodan District, Mogadishu", "Somalia"],
  },
  {
    icon: Newspaper,
    tint: "bg-terracotta-soft text-terracotta",
    label: "News Tips",
    lines: ["tips@lowershabelle.com", "Confidential — for story leads and documents"],
  },
  {
    icon: Mail,
    tint: "bg-amber-soft text-amber",
    label: "General Inquiries",
    lines: ["hello@lowershabelle.com", "Partnerships, feedback, and corrections"],
  },
  {
    icon: Phone,
    tint: "bg-sage-soft text-sage",
    label: "Lower Shabelle Desk",
    lines: ["+252 61 000 0000", "Sunday–Thursday, 9:00–17:00 EAT"],
  },
];

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const appLocale = locale as AppLocale;
  const dict = await getDictionary(appLocale);

  return (
    <div className="py-6">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sage">
          {(dict.nav as Record<string, string | undefined>)?.contact ?? "Contact"}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Get in touch
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          Whether you have a story to share, a tip for our reporters, or a
          correction to raise, we want to hear from you. Reach the newsroom
          using the form below or the details provided.
        </p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        {/* Form */}
        <div className="order-2 lg:order-1">
          <ContactForm />
        </div>

        {/* Contact details */}
        <aside className="order-1 space-y-8 lg:order-2">
          {CONTACTS.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="flex gap-4">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${c.tint}`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-ink">
                    {c.label}
                  </h2>
                  <div className="mt-1 space-y-0.5">
                    {c.lines.map((line) => (
                      <p key={line} className="text-sm text-ink-soft">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
