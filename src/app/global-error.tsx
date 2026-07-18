'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-ink text-paper">
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-alert">
            signal · critical error
          </p>
          <h1 className="mt-3 font-display text-2xl font-bold">Something went badly wrong</h1>
          <p className="mt-2 text-sm text-graphite">
            Please refresh the page. If this keeps happening, let us know.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded bg-signal px-4 py-2.5 font-medium text-ink transition hover:bg-signal-dim"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
