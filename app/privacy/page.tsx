import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="app-themed mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      {/* Intro */}
      <p className="mb-6 text-base leading-7">
        Your privacy matters to us. This app is designed to help families stay
        organized — not to collect or sell personal data.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">
        What Data We Store
      </h2>
      <p className="mb-4 leading-7">
        We store only the information you choose to enter, such as:
      </p>
      <ul className="list-disc pl-6 mb-4 leading-7">
        <li>Account details (name, email)</li>
        <li>Family member information</li>
        <li>Events, notes, and reminders</li>
        <li>Optional wellness or lifestyle tracking data</li>
      </ul>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">
        No Selling or Advertising Use
      </h2>
      <p className="mb-4 leading-7">
        <span className="font-semibold">
          We do not sell your data.
        </span>{' '}
        Your information is never shared with third parties for advertising,
        marketing, or public distribution.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">
        Private by Default
      </h2>
      <p className="mb-4 leading-7">
        Your data is private and visible only to you and the family members you
        choose to include. We do not make any of your content public.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">
        Children & Family Data
      </h2>
      <p className="mb-4 leading-7">
        Any information about children is managed by the account owner. This app
        does not allow independent child accounts. All child-related data is
        controlled by the parent or guardian using the app.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">
        Not a Medical Platform
      </h2>
      <p className="mb-4 leading-7">
        This app may allow you to log wellness or health-related information.
        However, it is not a medical system and does not provide medical advice,
        diagnosis, or treatment.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">
        Data Control & Deletion
      </h2>
      <p className="mb-4 leading-7">
        You have full control of your data. You can update or delete your
        information at any time. If you delete your account,
        <span className="font-semibold">
          {' '}all data will be permanently erased
        </span>.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">
        Security
      </h2>
      <p className="mb-4 leading-7">
        We take reasonable measures to protect your data. However, we recommend
        using strong passwords and keeping your account secure.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">
        Optional Improvements
      </h2>
      <p className="mb-4 leading-7">
        We may use anonymized and minimal data to improve the app experience.
        This will never include personal content or identifiable information.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">
        Updates
      </h2>
      <p className="leading-7">
        This policy may be updated as the app evolves. Continued use means you
        accept these updates.
      </p>
        <Link href="/profile" className="mt-6 inline-block text-sm font-medium text-emerald-600 underline">
          Back to Profile
        </Link>
      </div>
    </main>
  );
}
