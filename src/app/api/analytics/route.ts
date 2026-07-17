import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getIdeaAnalytics } from '@/lib/analytics';

/**
 * GET /api/analytics?ideaId=... — founder only.
 *
 * Unlike votes/investments/comments (public signals meant to be seen),
 * analytics expose granular engagement timing and totals that could help
 * someone game the platform (e.g. see exactly when momentum is
 * stalling) or that a founder may not want competitors reading off their
 * public idea page. Restricting to the founder mirrors how the original
 * brief frames this feature ("Founders should track interest over time,
 * view analytics, identify traction signals") and how real traction
 * dashboards are private to the team, not the public idea listing.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  const ideaId = request.nextUrl.searchParams.get('ideaId');
  if (!ideaId) {
    return NextResponse.json({ error: 'ideaId is required.' }, { status: 400 });
  }

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { id: true, authorId: true, createdAt: true },
  });
  if (!idea) {
    return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
  }
  if (idea.authorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the founder can view analytics for this idea.' },
      { status: 403 }
    );
  }

  const analytics = await getIdeaAnalytics(idea.id, idea.createdAt);
  return NextResponse.json({ analytics });
}
