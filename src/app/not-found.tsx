import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-signal">signal · 404</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-paper">Page not found</h1>
      <p className="mt-2 text-sm text-graphite">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/ideas"
        className="mt-6 inline-block rounded bg-signal px-4 py-2.5 font-medium text-ink transition hover:bg-signal-dim"
      >
        Browse ideas
      </Link>
    </main>
  );
}
