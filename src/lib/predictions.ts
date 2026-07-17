import { prisma } from '@/lib/prisma';
import { calculateOverallScore, roundToOneDecimal } from '@/lib/scoring';

export type MyPrediction = {
  marketScore: number;
  feasibilityScore: number;
  riskScore: number;
};

export type PredictionStats = {
  avgMarketScore: number | null;
  avgFeasibilityScore: number | null;
  avgRiskScore: number | null;
  overallScore: number | null; // null until at least one prediction exists
  predictionCount: number;
  myPrediction: MyPrediction | null;
};

const EMPTY_STATS: PredictionStats = {
  avgMarketScore: null,
  avgFeasibilityScore: null,
  avgRiskScore: null,
  overallScore: null,
  predictionCount: 0,
  myPrediction: null,
};

/** Batched prediction aggregates for a set of ideas — no N+1 per card/page. */
export async function getPredictionStatsMap(
  ideaIds: string[],
  userId?: string | null
): Promise<Map<string, PredictionStats>> {
  const stats = new Map<string, PredictionStats>();
  if (ideaIds.length === 0) return stats;

  for (const id of ideaIds) {
    stats.set(id, { ...EMPTY_STATS });
  }

  const [groups, myPredictions] = await Promise.all([
    prisma.prediction.groupBy({
      by: ['ideaId'],
      where: { ideaId: { in: ideaIds } },
      _avg: { marketScore: true, feasibilityScore: true, riskScore: true },
      _count: true,
    }),
    userId
      ? prisma.prediction.findMany({
          where: { userId, ideaId: { in: ideaIds } },
          select: { ideaId: true, marketScore: true, feasibilityScore: true, riskScore: true },
        })
      : Promise.resolve([]),
  ]);

  for (const group of groups) {
    const entry = stats.get(group.ideaId);
    if (!entry) continue;

    const avgMarket = group._avg.marketScore ?? 0;
    const avgFeasibility = group._avg.feasibilityScore ?? 0;
    const avgRisk = group._avg.riskScore ?? 0;

    entry.avgMarketScore = roundToOneDecimal(avgMarket);
    entry.avgFeasibilityScore = roundToOneDecimal(avgFeasibility);
    entry.avgRiskScore = roundToOneDecimal(avgRisk);
    entry.overallScore = calculateOverallScore(avgMarket, avgFeasibility, avgRisk);
    entry.predictionCount = group._count;
  }

  for (const prediction of myPredictions) {
    const entry = stats.get(prediction.ideaId);
    if (entry) {
      entry.myPrediction = {
        marketScore: prediction.marketScore,
        feasibilityScore: prediction.feasibilityScore,
        riskScore: prediction.riskScore,
      };
    }
  }

  return stats;
}

/** Convenience wrapper for a single idea. */
export async function getPredictionStats(
  ideaId: string,
  userId?: string | null
): Promise<PredictionStats> {
  const map = await getPredictionStatsMap([ideaId], userId);
  return map.get(ideaId) ?? { ...EMPTY_STATS };
}
