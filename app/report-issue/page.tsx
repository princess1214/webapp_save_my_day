'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAssistMyDayStore } from '../../lib/assistmyday-store';

const SUPPORT_EMAIL = 'emily.huahua.z@gmail.com';
const REPORT_SUBJECT = 'ASSISTMYDAY APP ISSUE - USER REPORT';

export default function ReportIssuePage() {
  const store = useAssistMyDayStore() as any;
  const profile = store.profile || {};
  const appPreferences = store.appPreferences || {};
  const [issue, setIssue] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [accountId, setAccountId] = useState('Unknown');
  const sharingEnabled = appPreferences.shareDataWithDeveloper === true;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAccountId(
        localStorage.getItem("assistmyday_account_id") ||
          localStorage.getItem("assistmyday_account_number") ||
          "Unknown"
      );
    }
  }, []);

  const mailto = useMemo(() => {
    const subject = encodeURIComponent(REPORT_SUBJECT);
    const body = encodeURIComponent(
      `Issue details:\n${issue || '(Please describe the problem)'}\n\nDevice/Browser:\n${deviceInfo || '(Optional)'}\n\nAccount ID: ${accountId}\nRegistered email: ${profile?.email || 'Unknown'}\n`
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }, [issue, deviceInfo, profile?.email, accountId]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="app-themed mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold">Report an issue</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Describe what happened and tap send. Your email app will open with a pre-filled failure report.
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

        {sharingEnabled ? (
          <a
            href={mailto}
            className="mt-5 inline-block rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Send failure report
          </a>
        ) : (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Failure report sharing is off. Enable it in Profile → Data privacy.
          </p>
        )}

        <Link href="/profile" className="mt-6 inline-block text-sm font-medium text-emerald-600 underline">
          Back to Profile
        </Link>
      </div>
    </main>
  );
}
