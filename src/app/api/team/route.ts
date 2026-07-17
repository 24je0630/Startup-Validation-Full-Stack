import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTeamMembers } from '@/lib/team';

/** GET /api/team?ideaId=... — public. */
export async function GET(request: NextRequest) {
  const ideaId = request.nextUrl.searchParams.get('ideaId');
  if (!ideaId) {
    return NextResponse.json({ error: 'ideaId is required.' }, { status: 400 });
  }

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { id: true, isPublic: true },
  });
  if (!idea || !idea.isPublic) {
    return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
  }

  const members = await getTeamMembers(ideaId);
  return NextResponse.json({ members });
}
