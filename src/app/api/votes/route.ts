import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getIdeaStats } from '@/lib/ideaStats';

const voteSchema = z.object({
  ideaId: z.string().min(1),
  value: z.union([z.literal(1), z.literal(-1)]),
});

/**
 * POST /api/votes — create, change, or remove a vote.
 *
 * Semantics: casting the same value you already voted removes the vote
 * (toggle off). Casting the opposite value flips it. This is the behavior
 * users expect from an upvote/downvote pair and satisfies "ability to
 * remove vote" without a separate DELETE endpoint.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to vote.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ideaId, value } = voteSchema.parse(body);

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, isPublic: true },
    });
    if (!idea || !idea.isPublic) {
      return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    // Read-then-write on the unique (userId, ideaId) row, inside a
    // transaction so a duplicate double-click can't create two rows.
    await prisma.$transaction(async (tx) => {
      const existing = await tx.vote.findUnique({
        where: { userId_ideaId: { userId: user.id, ideaId } },
      });

      if (!existing) {
        await tx.vote.create({ data: { userId: user.id, ideaId, value } });
      } else if (existing.value === value) {
        await tx.vote.delete({ where: { id: existing.id } });
      } else {
        await tx.vote.update({ where: { id: existing.id }, data: { value } });
      }
    });

    const stats = await getIdeaStats(ideaId, user.id);
    return NextResponse.json({ stats });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
