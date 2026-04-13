"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/auth-api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("Please fill in both passcode fields.");
      return;
    }

    if (password.length < 8) {
      setError("Your new passcode must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passcodes do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({ token, password });
      setSuccess("Your passcode has been reset successfully.");

      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Unable to reset passcode. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#fff6ef_0%,_#fdebdc_35%,_#f8d9cf_65%,_#f5cfc9_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-white/40 blur-3xl" />
        <div className="absolute top-1/4 -right-20 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-100/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/50 bg-white/55 shadow-[0_20px_80px_rgba(120,80,60,0.16)] backdrop-blur-2xl md:grid-cols-[1.08fr_0.92fr]">
          <section className="relative hidden min-h-[680px] flex-col justify-between overflow-hidden p-10 md:flex lg:p-12">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.48),rgba(255,244,238,0.12))]" />
            <div className="absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(circle_at_bottom,_rgba(255,221,205,0.6),_transparent_70%)]" />

            <div className="relative z-10">
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-white/60 bg-white/60 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm backdrop-blur transition hover:bg-white/80"
              >
                ← Back to login
              </Link>
            </div>

            <div className="relative z-10 max-w-md">
              <div className="mb-5 inline-flex items-center rounded-full border border-rose-200/60 bg-white/65 px-4 py-2 text-sm font-medium text-rose-700 shadow-sm backdrop-blur">
                A fresh start for your account
              </div>

              <h1 className="text-4xl font-semibold leading-tight text-stone-800 lg:text-5xl">
                Create a new passcode
              </h1>

              <p className="mt-4 text-lg leading-8 text-stone-600">
                Choose a new passcode to keep your family space secure and easy
                to return to.
              </p>

              <div className="mt-10 space-y-4">
                <div className="rounded-2xl border border-white/60 bg-white/55 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-stone-700">
                    Keep your account protected
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    A stronger passcode helps protect your plans, reminders,
                    records, and shared family details.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/45 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-stone-700">
                    Back to what matters
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    Once updated, you’ll be ready to sign in again and continue
                    where you left off.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-3 text-sm text-stone-500">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Secure password reset confirmation
            </div>
          </section>

          <section className="flex min-h-[680px] items-center justify-center px-6 py-10 sm:px-8 lg:px-10">
            <div className="w-full max-w-md">
              <div className="md:hidden">
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm backdrop-blur transition hover:bg-white/90"
                >
                  ← Back to login
                </Link>

                <div className="mt-6">
                  <h1 className="text-3xl font-semibold text-stone-800">
                    Create a new passcode
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Enter your new passcode below.
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white/72 p-6 shadow-[0_12px_40px_rgba(120,80,60,0.12)] backdrop-blur-xl sm:p-8">
                <div className="hidden md:block">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-rose-500/90">
                    Reset passcode
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-stone-800">
                    Set your new passcode
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    Enter and confirm your new passcode below.
                  </p>
                </div>

                {!token ? (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                    This reset link is missing a valid token. Please request a
                    new password reset email.
                    <div className="mt-4">
                      <Link
                        href="/forgot-password"
                        className="font-semibold text-rose-600 transition hover:text-rose-700 hover:underline"
                      >
                        Request a new link
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="mt-8 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">
                        New passcode
                      </label>
                      <input
                        type="password"
                        placeholder="Enter new passcode"
                        className="w-full rounded-2xl border border-stone-200/80 bg-white/80 px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">
                        Confirm new passcode
                      </label>
                      <input
                        type="password"
                        placeholder="Re-enter new passcode"
                        className="w-full rounded-2xl border border-stone-200/80 bg-white/80 px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    {error ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                      </div>
                    ) : null}

                    {success ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {success} Redirecting to login...
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-900/10 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isLoading ? "Updating passcode..." : "Save new passcode"}
                    </button>
                  </form>
                )}

                <div className="mt-6 text-center text-sm text-stone-600">
                  Back to sign in?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-rose-600 transition hover:text-rose-700 hover:underline"
                  >
                    Return to login
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
