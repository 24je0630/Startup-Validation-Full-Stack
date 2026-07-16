import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getIdeaStatsMap } from '@/lib/ideaStats';
import { IdeaCard } from '@/components/IdeaCard';

// Server Components can hit the database directly — this page queries Prisma
// rather than calling our own /api/ideas route to avoid the overhead of a
// self-fetch (re-serializing the same data through HTTP for no benefit).
// The API route still exists and is fully functional for external/client
// consumers (e.g. the "load more" pagination we'll wire up later).
export default async function IdeasPage() {
  const [ideas, currentUser] = await Promise.all([
    prisma.idea.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        category: true,
        createdAt: true,
        author: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    getCurrentUser(),
  ]);

  const statsMap = await getIdeaStatsMap(
    ideas.map((idea) => idea.id),
    currentUser?.id
  );

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm uppercase tracking-widest text-signal">
            signal · ideas
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-paper">
            What&apos;s being validated right now
          </h1>
        </div>
        <Link
          href="/ideas/new"
          className="shrink-0 rounded bg-signal px-4 py-2.5 font-medium text-ink transition hover:bg-signal-dim"
        >
          Post an idea
        </Link>
      </div>

      <div className="signal-divider my-8 w-full" />

      {ideas.length === 0 ? (
        <div className="rounded border border-line px-6 py-16 text-center">
          <p className="font-display text-lg text-paper">No ideas yet.</p>
          <p className="mt-2 text-sm text-graphite">
            Be the first to post one and start gathering signal.
          </p>
          <Link
            href="/ideas/new"
            className="mt-6 inline-block rounded bg-signal px-4 py-2.5 font-medium text-ink transition hover:bg-signal-dim"
          >
            Post an idea
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              {...idea}
              stats={statsMap.get(idea.id)!}
              isLoggedIn={Boolean(currentUser)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
