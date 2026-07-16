'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

type InvestmentPanelProps = {
  ideaId: string;
  initialTotalInvested: number;
  isLoggedIn: boolean;
  initialCredits: number | null;
};

export function InvestmentPanel({
  ideaId,
  initialTotalInvested,
  isLoggedIn,
  initialCredits,
}: InvestmentPanelProps) {
  const [totalInvested, setTotalInvested] = useState(initialTotalInvested);
  const [credits, setCredits] = useState(initialCredits);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a whole number of credits greater than 0.');
      return;
    }
    if (credits !== null && parsedAmount > credits) {
      setError(`You only have ${credits.toLocaleString()} credits available.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/invest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, amount: parsedAmount }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not process your investment.');
        return;
      }

      setTotalInvested(data.stats.totalInvested);
      setCredits(data.remainingCredits);
      setAmount('');
      setSuccess(`Invested ${parsedAmount.toLocaleString()} credits.`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded border border-line p-6">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-graphite">
          Total funding
        </p>
        <p className="font-mono text-2xl text-signal">
          {totalInvested.toLocaleString()} credits
        </p>
      </div>

      {isLoggedIn ? (
        <form onSubmit={handleSubmit} className="mt-5 flex items-end gap-3" noValidate>
          <label className="flex-1">
            <span className="font-mono text-xs uppercase tracking-widest text-graphite">
              Invest
            </span>
            <input
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50"
              className="mt-2 w-full rounded border border-line bg-transparent px-4 py-2.5 text-paper placeholder:text-graphite/60 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-signal px-5 py-2.5 font-medium text-ink transition hover:bg-signal-dim disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Investing…' : 'Invest'}
          </button>
        </form>
      ) : (
        <Link
          href="/login"
          className="mt-5 block rounded border border-line px-4 py-2.5 text-center font-medium text-paper transition hover:border-signal"
        >
          Log in to invest
        </Link>
      )}

      {credits !== null && (
        <p className="mt-3 font-mono text-xs text-graphite">
          Your balance: {credits.toLocaleString()} credits
        </p>
      )}

      {error && (
        <p className="mt-3 rounded border border-alert/40 bg-alert/10 px-4 py-2 text-sm text-alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 rounded border border-signal/40 bg-signal/10 px-4 py-2 text-sm text-signal">
          {success}
        </p>
      )}
    </div>
  );
}
