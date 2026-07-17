import { prisma } from '@/lib/prisma';

export type TeamMemberInfo = {
  id: string;
  role: 'FOUNDER' | 'MEMBER';
  user: { id: string; name: string };
};

/** All team members for an idea, founder first, then by join order. */
export async function getTeamMembers(ideaId: string): Promise<TeamMemberInfo[]> {
  return prisma.teamMember.findMany({
    where: { ideaId },
    select: { id: true, role: true, user: { select: { id: true, name: true } } },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }], // 'FOUNDER' < 'MEMBER' alphabetically
  });
}

export type MyTeamStatus =
  | { kind: 'not_logged_in' }
  | { kind: 'founder' }
  | { kind: 'member' }
  | { kind: 'request_pending' }
  | { kind: 'request_rejected' }
  | { kind: 'can_request' };

/**
 * Resolves what the current viewer should see in the team panel: are they
 * the founder, already a member, awaiting a decision, previously turned
 * down, or free to send a new request.
 */
export async function getMyTeamStatus(
  ideaId: string,
  founderId: string,
  userId?: string | null
): Promise<MyTeamStatus> {
  if (!userId) return { kind: 'not_logged_in' };
  if (userId === founderId) return { kind: 'founder' };

  const membership = await prisma.teamMember.findUnique({
    where: { userId_ideaId: { userId, ideaId } },
  });
  if (membership) return { kind: 'member' };

  const request = await prisma.joinRequest.findUnique({
    where: { userId_ideaId: { userId, ideaId } },
  });
  if (request?.status === 'PENDING') return { kind: 'request_pending' };
  if (request?.status === 'REJECTED') return { kind: 'request_rejected' };

  return { kind: 'can_request' };
}
