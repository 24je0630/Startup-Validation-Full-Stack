import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6">
      <p className="font-mono text-sm uppercase tracking-widest text-signal">
        signal · startup validation
      </p>
      <div className="signal-divider my-6 w-24" />
      <h1 className="font-display text-4xl font-bold leading-tight text-paper sm:text-6xl">
        Test the market
        <br />
        before you build it.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-graphite">
        Post your idea. Let votes, virtual investment, and founder feedback
        tell you whether there&apos;s real traction — before you spend a
        single week building.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          href="/ideas"
          className="rounded bg-signal px-5 py-2.5 font-medium text-ink transition hover:bg-signal-dim"
        >
          Browse ideas
        </Link>
        <Link
          href="/signup"
          className="rounded border border-line px-5 py-2.5 font-medium text-paper transition hover:border-signal"
        >
          Create account
        </Link>
        <Link
          href="/login"
          className="rounded border border-line px-5 py-2.5 font-medium text-paper transition hover:border-signal"
        >
          Log in
        </Link>
      </div>

      <div className="mt-10 flex flex-wrap gap-6 font-mono text-xs uppercase tracking-widest text-graphite">
        <span>votes</span>
        <span>·</span>
        <span>virtual investment</span>
        <span>·</span>
        <span>feedback</span>
        <span>·</span>
        <span>team formation</span>
        <span>·</span>
        <span>predictions</span>
        <span>·</span>
        <span>analytics</span>
      </div>
    </main>
  );
}
