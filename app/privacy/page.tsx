import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Temporary privacy text: Nestli stores profile, calendar, journal, and health information to run
          app features. Data is used for functionality and product improvement.
        </p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          You can manage your sharing preferences in Profile and request data deletion from the
          developer.
        </p>
        <Link href="/profile" className="mt-6 inline-block text-sm font-medium text-emerald-600 underline">
          Back to Profile
        </Link>
      </div>
    </main>
  );
}
