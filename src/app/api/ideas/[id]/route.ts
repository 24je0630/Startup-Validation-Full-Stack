import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

  return NextResponse.json({ idea });
}
