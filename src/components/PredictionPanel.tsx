'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import type { PredictionStats } from '@/lib/predictions';

type PredictionPanelProps = {
  ideaId: string;
  initialStats: PredictionStats;
  isLoggedIn: boolean;
};

const DEFAULT_SCORE = 5;

function ScoreSlider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-graphite">
          {label}
        </span>
        <span className="font-mono text-sm text-signal">{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-signal"
      />
      <p className="mt-1 text-xs text-graphite">{hint}</p>
    </label>
  );
}

/** A single labeled horizontal bar, used for both the average and overall scores. */
function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-xs text-graphite">
        <span className="uppercase tracking-widest">{label}</span>
        <span className="text-paper">{value.toFixed(1)} / 10</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-line">
        <div
          className="h-1.5 rounded-full bg-signal"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function PredictionPanel({ ideaId, initialStats, isLoggedIn }: PredictionPanelProps) {
  const { showToast } = useToast();
  const [stats, setStats] = useState(initialStats);
  const [market, setMarket] = useState(initialStats.myPrediction?.marketScore ?? DEFAULT_SCORE);
  const [feasibility, setFeasibility] = useState(
    initialStats.myPrediction?.feasibilityScore ?? DEFAULT_SCORE
  );
  const [risk, setRisk] = useState(initialStats.myPrediction?.riskScore ?? DEFAULT_SCORE);
  const [hasSubmitted, setHasSubmitted] = useState(Boolean(initialStats.myPrediction));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaId,
          marketScore: market,
          feasibilityScore: feasibility,
          riskScore: risk,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not submit your prediction.');
        return;
      }

      setStats(data.stats);
      showToast(hasSubmitted ? 'Prediction updated' : 'Prediction submitted');
      setHasSubmitted(true);
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
          Crowd prediction
          {stats.predictionCount > 0 && ` · ${stats.predictionCount} rating${stats.predictionCount === 1 ? '' : 's'}`}
        </p>
        {stats.overallScore !== null && (
          <p className="font-mono text-2xl text-signal">{stats.overallScore.toFixed(1)}</p>
        )}
      </div>

      {stats.overallScore === null ? (
        <p className="mt-3 text-sm text-graphite">No predictions yet — be the first to rate this idea.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <ScoreBar label="Market potential" value={stats.avgMarketScore!} />
          <ScoreBar label="Feasibility" value={stats.avgFeasibilityScore!} />
          <ScoreBar label="Risk" value={stats.avgRiskScore!} />
        </div>
      )}

      <div className="mt-6 border-t border-line pt-5">
        {isLoggedIn ? (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <p className="font-mono text-xs uppercase tracking-widest text-graphite">
              {hasSubmitted ? 'Your prediction' : 'Add your prediction'}
            </p>
            <ScoreSlider
              label="Market potential"
              hint="How large is the addressable market?"
              value={market}
              onChange={setMarket}
            />
            <ScoreSlider
              label="Feasibility"
              hint="How buildable is this with reasonable resources?"
              value={feasibility}
              onChange={setFeasibility}
            />
            <ScoreSlider
              label="Risk"
              hint="How risky is this? (10 = highest risk)"
              value={risk}
              onChange={setRisk}
            />
            {error && <p className="text-sm text-alert">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded bg-signal px-4 py-2.5 font-medium text-ink transition hover:bg-signal-dim disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : hasSubmitted ? 'Update prediction' : 'Submit prediction'}
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="block rounded border border-line px-4 py-2.5 text-center font-medium text-paper transition hover:border-signal"
          >
            Log in to add your prediction
          </Link>
        )}
      </div>
    </div>
  );
}
