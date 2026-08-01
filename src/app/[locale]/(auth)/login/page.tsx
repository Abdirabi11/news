import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getDictionary, isAppLocale, type AppLocale } from "@/i18n";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

// A calm editorial image for the left panel. Swap for a hosted asset
// or a Cloudinary URL when you have brand photography.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1400&q=80";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const appLocale = (isAppLocale(locale) ? locale : "en") as AppLocale;

  // Already signed in? Go to the dashboard.
  const session = await auth();
  if (session?.user) redirect(`/${appLocale}/dashboard`);

  const dict = await getDictionary(appLocale);

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-2">
      {/* Left — editorial image */}
      <div className="relative hidden lg:block">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        {/* Warm scrim so text is legible and the image reads on-brand */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/80">
            {dict.site.name}
          </p>
          <p className="mt-3 max-w-md text-2xl font-semibold leading-snug text-white">
            Independent journalism for Somalia and the Horn of Africa.
          </p>
        </div>
      </div>

      {/* Right — frosted form */}
      <div className="relative flex items-center justify-center px-6 py-16">
        {/* On mobile, echo a faint image wash behind the form for warmth */}
        <div className="pointer-events-none absolute inset-0 lg:hidden">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-10"
          />
        </div>

        <div className="relative z-10 flex w-full flex-col items-center">
          <Suspense fallback={null}>
            <LoginForm locale={appLocale} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
