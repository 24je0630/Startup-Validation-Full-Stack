import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getIdeaAnalytics } from '@/lib/analytics';
import { AnalyticsCharts } from '@/components/AnalyticsCharts';

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line p-5">
      <p className="font-mono text-xs uppercase tracking-widest text-graphite">{label}</p>
      <p className="mt-2 font-mono text-2xl text-signal">{value}</p>
    </div>
  );
}

export default async function AnalyticsPage({
  params,
}: {
  params: { id: string };
}) {
  const idea = await prisma.idea.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, createdAt: true, authorId: true, isPublic: true },
  });
  if (!idea || !idea.isPublic) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(`/login?redirect=/ideas/${idea.id}/analytics`);
  }
  // Analytics are private to the founder — see the rationale in
  // src/app/api/analytics/route.ts. Anyone else is bounced back to the
  // public idea page rather than shown a bare 403.
  if (currentUser.id !== idea.authorId) {
    redirect(`/ideas/${idea.id}`);
  }

  const analytics = await getIdeaAnalytics(idea.id, idea.createdAt);
  const { totals } = analytics;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <Link
        href={`/ideas/${idea.id}`}
        className="font-mono text-xs uppercase tracking-widest text-graphite hover:text-signal"
      >
        ← {idea.title}
      </Link>

      <p className="mt-6 font-mono text-sm uppercase tracking-widest text-signal">
        signal · analytics
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-paper">Traction dashboard</h1>
      <p className="mt-2 text-sm text-graphite">
        Last {analytics.windowDays} days · visible only to you as the founder
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Total votes" value={totals.totalVotes.toLocaleString()} />
        <SummaryCard
          label="Total investment"
          value={`${totals.totalInvested.toLocaleString()} cr`}
        />
        <SummaryCard label="Total comments" value={totals.totalComments.toLocaleString()} />
        <SummaryCard
          label="Overall score"
          value={totals.overallScore !== null ? totals.overallScore.toFixed(1) : '—'}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Upvotes" value={totals.upvotes.toLocaleString()} />
        <SummaryCard label="Downvotes" value={totals.downvotes.toLocaleString()} />
        <SummaryCard label="Net score" value={totals.score.toLocaleString()} />
        <SummaryCard label="Predictions" value={totals.predictionCount.toLocaleString()} />
      </div>

      <div className="mt-10">
        <AnalyticsCharts
          voteTrend={analytics.voteTrend}
          investmentTrend={analytics.investmentTrend}
          dailyActivity={analytics.dailyActivity}
        />
      </div>
    </main>
  );
}
