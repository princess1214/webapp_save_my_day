import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="app-themed mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold">Terms of Service</h1>
        {/* Intro */}
      <p className="mb-6 text-base leading-7">
        Welcome to our app — your family’s shared space for organizing life,
        memories, and daily routines. By using this app, you agree to the
        following terms.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">Use of the App</h2>
      <p className="mb-4 leading-7">
        This app is designed for personal and family organization, including
        tracking events, routines, and personal notes. You agree to use the app
        responsibly and only for lawful purposes.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">
        Not Medical or Professional Advice
      </h2>
      <p className="mb-4 leading-7">
        This app is <span className="font-semibold">not a medical service</span>.
        Any health-related information you enter is for personal tracking only.
        The app does not provide diagnosis, treatment, or professional advice.
        Always consult qualified professionals for medical or health decisions.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">Accounts</h2>
      <p className="mb-4 leading-7">
        You are responsible for maintaining the security of your account. Please
        choose a strong passcode and keep your login information private.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">
        Family & Child Data Responsibility
      </h2>
      <p className="mb-4 leading-7">
        This app allows you to manage family members such as children or pets.
        By adding this information, you confirm that you are responsible for the
        data entered and have the authority to manage it.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">Data Ownership</h2>
      <p className="mb-4 leading-7">
        You own your data. The content you create (events, notes, records)
        belongs to you and is stored only for your use within the app.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">
        Account Deletion & Data Removal
      </h2>
      <p className="mb-4 leading-7">
        You may delete your account at any time. When you delete your account,
        <span className="font-semibold">
          {' '}all associated data will be permanently removed
        </span>.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">Service Changes</h2>
      <p className="mb-4 leading-7">
        We may update or improve features over time. Continued use of the app
        means you accept any updates to these terms.
      </p>

      {/* Section */}
      <h2 className="font-bold text-xl mt-8 mb-2">Contact</h2>
      <p className="leading-7">
        If you have questions about these terms, please contact us through the
        app’s support or feedback feature.
      </p>
        <Link href="/profile" className="mt-6 inline-block text-sm font-medium text-emerald-600 underline">
          Back to Profile
        </Link>
      </div>
    </main>
  );
}
