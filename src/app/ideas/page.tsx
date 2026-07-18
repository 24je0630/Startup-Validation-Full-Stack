import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getIdeaStatsMap } from '@/lib/ideaStats';
import { IDEAS_PAGE_SIZE } from '@/lib/constants';
import { IdeaCard } from '@/components/IdeaCard';

// Server Components can hit the database directly — this page queries Prisma
// rather than calling our own /api/ideas route to avoid the overhead of a
// self-fetch (re-serializing the same data through HTTP for no benefit).
// The API route still exists and is fully functional for external/client
// consumers.
export default async function IdeasPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [ideas, totalCount, currentUser] = await Promise.all([
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
      skip: (page - 1) * IDEAS_PAGE_SIZE,
      take: IDEAS_PAGE_SIZE,
    }),
    prisma.idea.count({ where: { isPublic: true } }),
    getCurrentUser(),
  ]);

  const statsMap = await getIdeaStatsMap(
    ideas.map((idea) => idea.id),
    currentUser?.id
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / IDEAS_PAGE_SIZE));

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
          <p className="font-display text-lg text-paper">
            {page > 1 ? 'No more ideas.' : 'No ideas yet.'}
          </p>
          <p className="mt-2 text-sm text-graphite">
            {page > 1
              ? 'You have reached the end of the list.'
              : 'Be the first to post one and start gathering signal.'}
          </p>
          <Link
            href={page > 1 ? '/ideas' : '/ideas/new'}
            className="mt-6 inline-block rounded bg-signal px-4 py-2.5 font-medium text-ink transition hover:bg-signal-dim"
          >
            {page > 1 ? 'Back to page 1' : 'Post an idea'}
          </Link>
        </div>
      ) : (
        <>
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

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-between font-mono text-xs text-graphite">
              <PageLink page={page - 1} disabled={page <= 1}>
                ← Previous
              </PageLink>
              <span>
                Page {page} of {totalPages}
              </span>
              <PageLink page={page + 1} disabled={page >= totalPages}>
                Next →
              </PageLink>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="rounded border border-line px-4 py-2 opacity-40">{children}</span>;
  }
  return (
    <Link
      href={`/ideas?page=${page}`}
      className="rounded border border-line px-4 py-2 transition hover:border-signal hover:text-signal"
    >
      {children}
    </Link>
  );
}
