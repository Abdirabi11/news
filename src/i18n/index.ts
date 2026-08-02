export const LOCALES = ["en", "so", "ar"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export const isAppLocale = (value: string): value is AppLocale =>
  (LOCALES as readonly string[]).includes(value);

export const dirFor = (locale: AppLocale): "ltr" | "rtl" =>
  locale === "ar" ? "rtl" : "ltr";

/** Native-script names, for the language switcher. */
export const LOCALE_NAMES: Record<AppLocale, string> = {
  en: "English",
  so: "Soomaali",
  ar: "العربية",
};

/** BCP-47 tags for <html lang> and date formatting. */
export const LOCALE_TAGS: Record<AppLocale, string> = {
  en: "en",
  so: "so",
  ar: "ar",
};

export type Dictionary = typeof import("./dictionaries/en.json");

const loaders: Record<AppLocale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  so: () => import("./dictionaries/so.json").then((m) => m.default),
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
};

export const getDictionary = (locale: AppLocale): Promise<Dictionary> =>
  loaders[locale]();

/** Locale-aware date formatting for publication dates. */
export const formatDate = (date: Date, locale: AppLocale): string =>
  new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);


export function localeHref(locale: AppLocale, path: string = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return p;
  return p === "/" ? `/${locale}` : `/${locale}${p}`;
}

/** Absolute canonical URL for a locale — for metadata, JSON-LD, sitemap, RSS. */
export function localeUrl(
  siteUrl: string,
  locale: AppLocale,
  path: string = "/",
): string {
  return `${siteUrl}${localeHref(locale, path)}`;
}