import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { predictSchema } from '@/lib/validation';
import { getPredictionStats } from '@/lib/predictions';

/**
 * POST /api/predict — create or update the current user's prediction for
 * an idea. Uses Prisma's `upsert` against the `@@unique([userId, ideaId])`
 * constraint, so a resubmission always updates the same row — there is no
 * code path that can create a second prediction for the same user+idea.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'You must be logged in to submit a prediction.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { ideaId, marketScore, feasibilityScore, riskScore } = predictSchema.parse(body);

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, isPublic: true },
    });
    if (!idea || !idea.isPublic) {
      return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    await prisma.prediction.upsert({
      where: { userId_ideaId: { userId: user.id, ideaId } },
      update: { marketScore, feasibilityScore, riskScore },
      create: { userId: user.id, ideaId, marketScore, feasibilityScore, riskScore },
    });

    const stats = await getPredictionStats(ideaId, user.id);
    return NextResponse.json({ stats });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Prediction error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

/** GET /api/predict?ideaId=... — public. Individual predictions + aggregates. */
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

  const currentUser = await getCurrentUser();
  const [predictions, stats] = await Promise.all([
    prisma.prediction.findMany({
      where: { ideaId },
      select: {
        id: true,
        marketScore: true,
        feasibilityScore: true,
        riskScore: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    getPredictionStats(ideaId, currentUser?.id),
  ]);

  return NextResponse.json({ predictions, stats });
}
