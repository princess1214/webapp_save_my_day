'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

const SUPPORT_EMAIL = 'developer@example.com';

export default function ReportIssuePage() {
  const [issue, setIssue] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');

  const mailto = useMemo(() => {
    const subject = encodeURIComponent('Nestli app issue report');
    const body = encodeURIComponent(`Issue details:\n${issue || '(Please describe the problem)'}\n\nDevice/Browser:\n${deviceInfo || '(Optional)'}\n`);
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }, [issue, deviceInfo]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="app-themed mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold">Report an issue</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Describe what happened and tap send. Your email app will open with a pre-filled message.
        </p>

        <label className="mt-4 block text-sm font-medium">What went wrong?</label>
        <textarea
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          className="mt-2 min-h-36 w-full rounded-xl border border-slate-200 p-3 dark:border-slate-600 dark:bg-slate-800"
          placeholder="I tapped Save on Journal, but the post did not appear..."
        />

        <label className="mt-4 block text-sm font-medium">Device / Browser (optional)</label>
        <input
          value={deviceInfo}
          onChange={(e) => setDeviceInfo(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 p-3 dark:border-slate-600 dark:bg-slate-800"
          placeholder="iPhone 15, iOS 19, Safari"
        />

        <a
          href={mailto}
          className="mt-5 inline-block rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
        >
          Send to developer
        </a>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Current destination: {SUPPORT_EMAIL}</p>
        <Link href="/profile" className="mt-6 inline-block text-sm font-medium text-emerald-600 underline">
          Back to Profile
        </Link>
      </div>
    </main>
  );
}
