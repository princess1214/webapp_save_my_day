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
  const [loading, setLoading] = useState(false);

  const onChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signup(form);
      router.push('/home');
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-[380px] border rounded-2xl p-6">
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

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <button className="w-full bg-black text-white py-2 rounded">
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