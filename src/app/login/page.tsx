'use client';

import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormField } from '@/components/FormField';
import { loginSchema } from '@/lib/validation';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid input');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="font-mono text-sm uppercase tracking-widest text-signal">
        signal · welcome back
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-paper">
        Log in
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <FormField
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          placeholder="you@startup.com"
        />
        <FormField
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="Your password"
        />

        {error && (
          <p className="rounded border border-alert/40 bg-alert/10 px-4 py-2.5 text-sm text-alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-signal px-4 py-2.5 font-medium text-ink transition hover:bg-signal-dim disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-graphite">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-signal hover:underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
