"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export function LoginForm({ locale }: { locale: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? `/${locale}/dashboard`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!email || !password) {
      setError("Please enter both your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });
      if (!res || res.error) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="w-full max-w-sm rounded-4xl bg-surface/80 p-8 shadow-lift backdrop-blur-xl sm:p-10"
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSubmit();
      }}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Sign in to the newsroom to write and publish.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-semibold text-ink-soft">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="admin@newsroom.com"
            className="w-full rounded-xl bg-canvas px-4 py-3 text-sm text-ink placeholder:text-ink-muted transition focus:outline-none focus:ring-4 focus:ring-sage-soft"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-semibold text-ink-soft">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
              className="w-full rounded-xl bg-canvas px-4 py-3 pe-11 text-sm text-ink placeholder:text-ink-muted transition focus:outline-none focus:ring-4 focus:ring-sage-soft"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-ink-muted hover:text-ink"
            >
              {showPw ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="flex items-center gap-2 text-sm text-terracotta">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage px-6 py-3 text-sm font-semibold text-white transition hover:bg-sage-hover disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                aria-hidden
              />
            </>
          )}
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        Protected area. Authorised staff only.
      </p>
    </div>
  );
}
