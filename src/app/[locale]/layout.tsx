import "@/app/globals.css";
import { notFound } from "next/navigation";
import { Figtree, Lora, Noto_Sans_Arabic } from "next/font/google";
import {
  LOCALES,
  LOCALE_TAGS,
  isAppLocale,
  dirFor,
  type AppLocale,
} from "@/i18n";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const metadata = {
  title: { default: "LowerShabelle Media", template: "%s — LowerShabelle Media" },
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();

  const appLocale = locale as AppLocale;
  const dir = dirFor(appLocale);

  return (
    <html
      lang={LOCALE_TAGS[appLocale]}
      dir={dir}
      className={`${figtree.variable} ${lora.variable} ${notoArabic.variable}`}
    >
      <body
        className="min-h-screen bg-canvas text-ink antialiased"
        style={{
          fontFamily:
            appLocale === "ar"
              ? "var(--font-arabic), sans-serif"
              : "var(--font-sans), system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
