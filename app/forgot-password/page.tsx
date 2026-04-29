"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await requestPasswordReset({ email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Unable to send reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-themed relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#fff6ef_0%,_#fdebdc_35%,_#f8d9cf_65%,_#f5cfc9_100%)] dark:bg-slate-950 dark:text-slate-100">
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
                Gentle account recovery
              </div>

              <h1 className="text-4xl font-semibold leading-tight text-stone-800 lg:text-5xl">
                Reset your passcode
              </h1>

              <p className="mt-4 text-lg leading-8 text-stone-600">
                Enter your email and we’ll send you a reset link so you can get
                back to your family space.
              </p>

              <div className="mt-10 space-y-4">
                <div className="rounded-2xl border border-white/60 bg-white/55 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-stone-700">
                    Quick and secure
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    We’ll help you reconnect with your account without losing
                    your family plans, moments, or records.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/45 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-stone-700">
                    Made to feel familiar
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    Same calm, welcoming space — even when you just need help
                    getting back in.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-3 text-sm text-stone-500">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Secure password recovery flow
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
                    Reset your passcode
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Enter your email to receive a reset link.
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white/72 p-6 shadow-[0_12px_40px_rgba(120,80,60,0.12)] backdrop-blur-xl sm:p-8">
                <div className="hidden md:block">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-rose-500/90">
                    Forgot passcode
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-stone-800">
                    Let’s help you back in
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    Enter the email linked to your account. If it matches our
                    records, we’ll send a reset link.
                  </p>
                </div>

                {submitted ? (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                    If an account exists for{" "}
                    <span className="font-semibold">{email}</span>, a password
                    reset link has been sent.
                    <div className="mt-4">
                      <Link
                        href="/login"
                        className="font-semibold text-rose-600 transition hover:text-rose-700 hover:underline"
                      >
                        Return to login
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="mt-8 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        className="w-full rounded-2xl border border-stone-200/80 bg-white/80 px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>

                    {error ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-900/10 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isLoading ? "Sending link..." : "Send reset link"}
                    </button>
                  </form>
                )}

                <div className="mt-6 text-center text-sm text-stone-600">
                  Remember your passcode?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-rose-600 transition hover:text-rose-700 hover:underline"
                  >
                    Back to login
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
