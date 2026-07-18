'use client';

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-alert">signal · error</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-paper">Something went wrong</h1>
      <p className="mt-2 text-sm text-graphite">
        An unexpected error occurred loading this page. You can try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded bg-signal px-4 py-2.5 font-medium text-ink transition hover:bg-signal-dim"
      >
        Try again
      </button>
    </main>
  );
}
