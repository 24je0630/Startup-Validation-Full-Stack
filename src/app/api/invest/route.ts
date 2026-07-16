import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getIdeaStats } from '@/lib/ideaStats';

const investSchema = z.object({
  ideaId: z.string().min(1),
  amount: z.number().int().positive().max(1_000_000),
});

/** POST /api/invest — deducts credits and records an investment, atomically. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to invest.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ideaId, amount } = investSchema.parse(body);

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, isPublic: true },
    });
    if (!idea || !idea.isPublic) {
      return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // The WHERE clause (credits >= amount) and the decrement happen in a
      // single atomic UPDATE statement. Two concurrent requests can't both
      // pass this check against the same stale balance and overdraw the
      // account — the second one simply matches zero rows.
      const deduction = await tx.user.updateMany({
        where: { id: user.id, credits: { gte: amount } },
        data: { credits: { decrement: amount } },
      });

      if (deduction.count === 0) {
        return null; // insufficient credits — nothing was written
      }

      await tx.investment.create({ data: { userId: user.id, ideaId, amount } });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { credits: true },
      });
    });

    if (!result) {
      return NextResponse.json(
        { error: 'You do not have enough credits for this investment.' },
        { status: 400 }
      );
    }

    const stats = await getIdeaStats(ideaId, user.id);
    return NextResponse.json({ stats, remainingCredits: result.credits });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Invest error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
