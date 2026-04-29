'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signup } from '@/lib/auth-api';

export default function WelcomePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    birthday: '',
    role: '',
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const onChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const res = await signup(form);
      if (res?.welcomeEmailQueued) {
        setInfo('Welcome message was sent to your mailbox (demo).');
      }
      router.push('/home');
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  }

  return (
    <main className="app-themed min-h-screen flex items-center justify-center bg-[#F7F8FA] dark:bg-slate-950 dark:text-slate-100">
      <div className="w-[380px] border rounded-2xl p-6 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100">
        <h1 className="text-2xl font-semibold">Create account</h1>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input
            placeholder="Name"
            className="w-full border p-2 rounded"
            onChange={(e) => onChange('fullName', e.target.value)}
          />

          <input
            placeholder="Email"
            className="w-full border p-2 rounded"
            onChange={(e) => onChange('email', e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Passcode"
            className="w-full border p-2 rounded"
            onChange={(e) => onChange('password', e.target.value)}
            required
          />

          <input
            type="date"
            className="w-full border p-2 rounded"
            onChange={(e) => onChange('birthday', e.target.value)}
          />

          <input
            placeholder="Family role"
            className="w-full border p-2 rounded"
            onChange={(e) => onChange('role', e.target.value)}
          />

          <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1"
              required
            />
            <span>
              I have read and agree to the{' '}
              <Link href="/terms" className="underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {error && <div className="text-red-500 text-sm">{error}</div>}
          {info && <div className="text-emerald-600 text-sm">{info}</div>}

          <button
            disabled={!acceptedTerms || loading}
            className="w-full bg-black text-white py-2 rounded disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <div className="mt-4 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
