import { redirect } from "next/navigation";
import { Newspaper } from "lucide-react";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/editorial/login-form";

export const metadata = { title: "Sign in — Newsroom" };

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const session = await auth();
  if (session?.user) redirect(`/${locale}/articles`);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-700 text-white">
            <Newspaper className="h-5 w-5" aria-hidden />
          </span>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
              Newsroom
            </h1>
            <p className="text-sm text-zinc-500">
              Sign in to the editorial desk
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <LoginForm locale={locale} />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Staff access only. Contact an administrator for an account.
        </p>
      </div>
    </main>
  );
}
