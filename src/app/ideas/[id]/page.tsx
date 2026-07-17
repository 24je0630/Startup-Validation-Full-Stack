import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getIdeaStats } from '@/lib/ideaStats';
import { getCommentTreeForIdea } from '@/lib/comments';
import { getTeamMembers, getMyTeamStatus } from '@/lib/team';
import { getPredictionStats } from '@/lib/predictions';
import { VoteButtons } from '@/components/VoteButtons';
import { InvestmentPanel } from '@/components/InvestmentPanel';
import { CommentSection } from '@/components/CommentSection';
import { TeamPanel } from '@/components/TeamPanel';
import { PredictionPanel } from '@/components/PredictionPanel';

export default async function IdeaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const idea = await prisma.idea.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      category: true,
      isPublic: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });

  if (!idea || !idea.isPublic) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const [stats, comments, members, myStatus, predictionStats] = await Promise.all([
    getIdeaStats(idea.id, currentUser?.id),
    getCommentTreeForIdea(idea.id),
    getTeamMembers(idea.id),
    getMyTeamStatus(idea.id, idea.author.id, currentUser?.id),
    getPredictionStats(idea.id, currentUser?.id),
  ]);

  // Only the founder needs the pending-requests queue — no reason to run
  // this query (or leak requester identities) for anyone else.
  const pendingRequests =
    myStatus.kind === 'founder'
      ? await prisma.joinRequest.findMany({
          where: { ideaId: idea.id, status: 'PENDING' },
          select: {
            id: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <Link
          href="/ideas"
          className="font-mono text-xs uppercase tracking-widest text-graphite hover:text-signal"
        >
          ← All ideas
        </Link>
        {myStatus.kind === 'founder' && (
          <Link
            href={`/ideas/${idea.id}/analytics`}
            className="rounded border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-graphite transition hover:border-signal hover:text-signal"
          >
            View analytics →
          </Link>
        )}
      </div>

      <div className="mt-6 flex items-start gap-5">
        <VoteButtons
          ideaId={idea.id}
          initialScore={stats.score}
          initialUserVote={stats.userVote}
          isLoggedIn={Boolean(currentUser)}
          size="lg"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-3xl font-bold text-paper sm:text-4xl">
              {idea.title}
            </h1>
            {idea.category && (
              <span className="shrink-0 rounded border border-line px-2.5 py-1 font-mono text-xs uppercase tracking-widest text-graphite">
                {idea.category}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3 font-mono text-xs text-graphite">
            <span>by {idea.author.name}</span>
            <span>·</span>
            <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
            <span>·</span>
            <span>
              {stats.upvotes} up · {stats.downvotes} down
            </span>
          </div>

          {idea.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {idea.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-line/60 px-2.5 py-1 font-mono text-xs text-graphite"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="signal-divider my-8 w-full" />

      <p className="whitespace-pre-wrap leading-relaxed text-paper">
        {idea.description}
      </p>

      <div className="mt-10">
        <InvestmentPanel
          ideaId={idea.id}
          initialTotalInvested={stats.totalInvested}
          isLoggedIn={Boolean(currentUser)}
          initialCredits={currentUser?.credits ?? null}
        />
      </div>

      <div className="signal-divider my-10 w-full" />

      <CommentSection
        ideaId={idea.id}
        comments={comments}
        isLoggedIn={Boolean(currentUser)}
      />

      <div className="mt-10">
        <TeamPanel
          ideaId={idea.id}
          members={members}
          myStatus={myStatus}
          pendingRequests={pendingRequests}
        />
      </div>

      <div className="mt-10">
        <PredictionPanel
          ideaId={idea.id}
          initialStats={predictionStats}
          isLoggedIn={Boolean(currentUser)}
        />
      </div>

    </main>
  );
}
