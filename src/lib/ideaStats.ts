import { prisma } from '@/lib/prisma';

export type IdeaStats = {
  score: number;
  upvotes: number;
  downvotes: number;
  userVote: 1 | -1 | null;
};

const EMPTY_STATS: IdeaStats = {
  score: 0,
  upvotes: 0,
  downvotes: 0,
  userVote: null,
};

/**
 * Computes vote aggregates for a batch of ideas in two queries total (not
 * one query per idea), so listing pages stay fast regardless of how many
 * ideas are on screen.
 */
export async function getIdeaStatsMap(
  ideaIds: string[],
  userId?: string | null
): Promise<Map<string, IdeaStats>> {
  const stats = new Map<string, IdeaStats>();
  if (ideaIds.length === 0) return stats;

  for (const id of ideaIds) {
    stats.set(id, { ...EMPTY_STATS });
  }

  const [voteGroups, userVotes] = await Promise.all([
    prisma.vote.groupBy({
      by: ['ideaId', 'value'],
      where: { ideaId: { in: ideaIds } },
      _count: true,
    }),
    userId
      ? prisma.vote.findMany({
          where: { userId, ideaId: { in: ideaIds } },
          select: { ideaId: true, value: true },
        })
      : Promise.resolve([]),
  ]);

  for (const group of voteGroups) {
    const entry = stats.get(group.ideaId);
    if (!entry) continue;
    if (group.value === 1) entry.upvotes = group._count;
    if (group.value === -1) entry.downvotes = group._count;
  }
  for (const entry of stats.values()) {
    entry.score = entry.upvotes - entry.downvotes;
  }

  for (const vote of userVotes) {
    const entry = stats.get(vote.ideaId);
    if (entry) entry.userVote = vote.value as 1 | -1;
  }

  return stats;
}

/** Convenience wrapper for a single idea (e.g. the detail page). */
export async function getIdeaStats(
  ideaId: string,
  userId?: string | null
): Promise<IdeaStats> {
  const map = await getIdeaStatsMap([ideaId], userId);
  return map.get(ideaId) ?? { ...EMPTY_STATS };
}
