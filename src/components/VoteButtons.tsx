'use client';

import { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';

type VoteButtonsProps = {
  ideaId: string;
  initialScore: number;
  initialUserVote: 1 | -1 | null;
  isLoggedIn: boolean;
  size?: 'sm' | 'lg';
};

export function VoteButtons({
  ideaId,
  initialScore,
  initialUserVote,
  isLoggedIn,
  size = 'sm',
}: VoteButtonsProps) {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<1 | -1 | null>(initialUserVote);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function castVote(value: 1 | -1) {
    if (isPending) return;
    setError(null);

    const previousScore = score;
    const previousVote = userVote;

    // Optimistic update: apply the expected result immediately, then
    // reconcile with whatever the server actually persisted.
    const nextVote = userVote === value ? null : value;
    const delta =
      userVote === value
        ? -value // toggling off
        : userVote === null
          ? value // first vote
          : value * 2; // flipping from one direction to the other

    setUserVote(nextVote);
    setScore(previousScore + delta);
    setIsPending(true);

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, value }),
      });
      const data = await res.json();

      if (!res.ok) {
        setScore(previousScore);
        setUserVote(previousVote);
        setError(data.error ?? 'Could not register your vote.');
        return;
      }

      setScore(data.stats.score);
      setUserVote(data.stats.userVote);
    } catch {
      setScore(previousScore);
      setUserVote(previousVote);
      setError('Network error. Please try again.');
    } finally {
      setIsPending(false);
    }
  }

  const buttonSize = size === 'lg' ? 'h-10 w-10 text-base' : 'h-7 w-7 text-sm';
  const scoreSize = size === 'lg' ? 'text-xl' : 'text-sm';

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-2 rounded border border-line px-3 py-1.5 font-mono text-xs text-graphite transition hover:border-signal hover:text-signal"
        title="Log in to vote"
      >
        <span>▲</span>
        <span>{score}</span>
        <span>▼</span>
      </Link>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => castVote(1)}
        disabled={isPending}
        aria-pressed={userVote === 1}
        aria-label="Upvote"
        className={clsx(
          'flex items-center justify-center rounded border transition disabled:cursor-not-allowed disabled:opacity-60',
          buttonSize,
          userVote === 1
            ? 'border-signal bg-signal/10 text-signal'
            : 'border-line text-graphite hover:border-signal hover:text-signal'
        )}
      >
        ▲
      </button>
      <span className={clsx('font-mono text-paper', scoreSize)}>{score}</span>
      <button
        type="button"
        onClick={() => castVote(-1)}
        disabled={isPending}
        aria-pressed={userVote === -1}
        aria-label="Downvote"
        className={clsx(
          'flex items-center justify-center rounded border transition disabled:cursor-not-allowed disabled:opacity-60',
          buttonSize,
          userVote === -1
            ? 'border-alert bg-alert/10 text-alert'
            : 'border-line text-graphite hover:border-alert hover:text-alert'
        )}
      >
        ▼
      </button>
      {error && <p className="max-w-[6rem] text-center text-[10px] text-alert">{error}</p>}
    </div>
  );
}
