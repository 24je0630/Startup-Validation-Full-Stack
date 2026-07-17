import { prisma } from '@/lib/prisma';
import { getIdeaStats } from '@/lib/ideaStats';
import { getPredictionStats } from '@/lib/predictions';

const ANALYTICS_WINDOW_DAYS = 30;

export type DailyPoint = { date: string; value: number };
export type ActivityPoint = {
  date: string;
  votes: number;
  comments: number;
  investments: number;
};

export type IdeaAnalytics = {
  totals: {
    totalVotes: number;
    upvotes: number;
    downvotes: number;
    score: number;
    totalInvested: number;
    totalComments: number;
    predictionCount: number;
    avgMarketScore: number | null;
    avgFeasibilityScore: number | null;
    avgRiskScore: number | null;
    overallScore: number | null;
  };
  /** Cumulative net vote score by day, based on each vote's ORIGINAL cast
   *  date but its CURRENT value — see the note in getIdeaAnalytics(). */
  voteTrend: DailyPoint[];
  /** Cumulative total credits invested by day — exact, since investments
   *  are append-only (never edited or deleted). */
  investmentTrend: DailyPoint[];
  /** Per-day (non-cumulative) counts, for the combined activity chart. */
  dailyActivity: ActivityPoint[];
  windowDays: number;
};

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDayRange(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  );
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor <= last) {
    days.push(utcDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/**
 * Builds the full traction dashboard for one idea: summary totals plus
 * day-by-day trend data for the last `ANALYTICS_WINDOW_DAYS` days (or since
 * the idea was posted, if younger than that).
 *
 * Performance: the three time-series come from three `GROUP BY` queries at
 * the database, not from fetching every vote/investment/comment row and
 * grouping in application code — this stays cheap regardless of how much
 * activity an idea has accumulated.
 *
 * Accuracy note on voteTrend: votes can be flipped or removed (see Phase 4),
 * and we don't keep a separate append-only event log for them. So the vote
 * trend is computed from the CURRENT votes table, grouped by each vote's
 * ORIGINAL `createdAt` day. This means it always reconciles exactly to the
 * current total score, and shows *when* today's standing was built up — but
 * a vote that was cast on day 3 and later flipped on day 10 is attributed
 * to day 3, not day 10. investmentTrend has no such caveat: investments are
 * append-only, so its cumulative sum is an exact historical record.
 */
export async function getIdeaAnalytics(
  ideaId: string,
  ideaCreatedAt: Date
): Promise<IdeaAnalytics> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - (ANALYTICS_WINDOW_DAYS - 1));
  const rangeStart = ideaCreatedAt > windowStart ? ideaCreatedAt : windowStart;

  const [
    voteStats,
    predictionStats,
    totalComments,
    voteRows,
    investmentRows,
    commentRows,
    priorVotes,
    priorInvestments,
  ] = await Promise.all([
    getIdeaStats(ideaId),
    getPredictionStats(ideaId),
    prisma.comment.count({ where: { ideaId } }),
    prisma.$queryRaw<{ day: string; net: number; count: number }[]>`
      SELECT TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
             SUM("value")::int AS net, COUNT(*)::int AS count
      FROM votes
      WHERE "ideaId" = ${ideaId} AND "createdAt" >= ${rangeStart}
      GROUP BY day
      ORDER BY day ASC
    `,
    prisma.$queryRaw<{ day: string; total: number; count: number }[]>`
      SELECT TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
             SUM("amount")::int AS total, COUNT(*)::int AS count
      FROM investments
      WHERE "ideaId" = ${ideaId} AND "createdAt" >= ${rangeStart}
      GROUP BY day
      ORDER BY day ASC
    `,
    prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
      FROM comments
      WHERE "ideaId" = ${ideaId} AND "createdAt" >= ${rangeStart}
      GROUP BY day
      ORDER BY day ASC
    `,
    // Baseline the cumulative lines with whatever accumulated BEFORE the
    // window starts, so day 1 of the chart shows the true running total,
    // not just that single day's delta.
    prisma.vote.aggregate({
      where: { ideaId, createdAt: { lt: rangeStart } },
      _sum: { value: true },
    }),
    prisma.investment.aggregate({
      where: { ideaId, createdAt: { lt: rangeStart } },
      _sum: { amount: true },
    }),
  ]);

  const days = buildDayRange(rangeStart, now);
  const voteByDay = new Map(voteRows.map((r) => [r.day, r]));
  const investByDay = new Map(investmentRows.map((r) => [r.day, r]));
  const commentByDay = new Map(commentRows.map((r) => [r.day, r]));

  let runningScore = priorVotes._sum.value ?? 0;
  let runningInvested = priorInvestments._sum.amount ?? 0;

  const voteTrend: DailyPoint[] = [];
  const investmentTrend: DailyPoint[] = [];
  const dailyActivity: ActivityPoint[] = [];

  for (const day of days) {
    const v = voteByDay.get(day);
    const inv = investByDay.get(day);
    const c = commentByDay.get(day);

    runningScore += v?.net ?? 0;
    runningInvested += inv?.total ?? 0;

    voteTrend.push({ date: day, value: runningScore });
    investmentTrend.push({ date: day, value: runningInvested });
    dailyActivity.push({
      date: day,
      votes: v?.count ?? 0,
      comments: c?.count ?? 0,
      investments: inv?.count ?? 0,
    });
  }

  return {
    totals: {
      totalVotes: voteStats.upvotes + voteStats.downvotes,
      upvotes: voteStats.upvotes,
      downvotes: voteStats.downvotes,
      score: voteStats.score,
      totalInvested: voteStats.totalInvested,
      totalComments,
      predictionCount: predictionStats.predictionCount,
      avgMarketScore: predictionStats.avgMarketScore,
      avgFeasibilityScore: predictionStats.avgFeasibilityScore,
      avgRiskScore: predictionStats.avgRiskScore,
      overallScore: predictionStats.overallScore,
    },
    voteTrend,
    investmentTrend,
    dailyActivity,
    windowDays: days.length,
  };
}
