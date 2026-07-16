import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getIdeaStats } from '@/lib/ideaStats';

/** GET /api/ideas/[id] — public. */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
  }

  const currentUser = await getCurrentUser();
  const stats = await getIdeaStats(idea.id, currentUser?.id);

  return NextResponse.json({ idea: { ...idea, stats } });
}
