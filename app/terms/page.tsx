import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="app-themed mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold">Terms of Service</h1>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Temporary terms text: by using Nestli, you agree to use the app responsibly and keep your
          family data accurate. You are responsible for the information you store and share with invited
          family members.
        </p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          We may update these terms as the product evolves. Continued use means you accept the latest
          terms.
        </p>
        <Link href="/profile" className="mt-6 inline-block text-sm font-medium text-emerald-600 underline">
          Back to Profile
        </Link>
      </div>
    </main>
  );
}
