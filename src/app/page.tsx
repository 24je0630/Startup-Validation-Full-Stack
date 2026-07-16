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
      <div className="mt-10 flex items-center gap-4 font-mono text-xs text-graphite">
        <span className="rounded border border-line px-3 py-1">
          phase 1 — project scaffold
        </span>
        <span>auth · ideas · voting · credits · analytics — coming next</span>
      </div>
    </main>
  );
}
