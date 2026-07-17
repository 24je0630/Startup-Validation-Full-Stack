import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { createIdeaSchema } from '@/lib/validation';
import { getIdeaStatsMap } from '@/lib/ideaStats';
import { getPredictionStatsMap } from '@/lib/predictions';

const PAGE_SIZE = 20;

const IDEA_LIST_SELECT = {
  id: true,
  title: true,
  description: true,
  tags: true,
  category: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
} as const;

/** GET /api/ideas — public, paginated, newest first, includes vote/funding stats. */
export async function GET(request: NextRequest) {
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1);
  const currentUser = await getCurrentUser();

  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({
      where: { isPublic: true },
      select: IDEA_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.idea.count({ where: { isPublic: true } }),
  ]);

  const ideaIds = ideas.map((idea) => idea.id);
  const [statsMap, predictionStatsMap] = await Promise.all([
    getIdeaStatsMap(ideaIds, currentUser?.id),
    getPredictionStatsMap(ideaIds, currentUser?.id),
  ]);

  return NextResponse.json({
    ideas: ideas.map((idea) => ({
      ...idea,
      stats: statsMap.get(idea.id),
      predictionStats: predictionStatsMap.get(idea.id),
    })),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    },
  });
}

/** POST /api/ideas — requires an authenticated session. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to post an idea.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, category, tags } = createIdeaSchema.parse(body);

    const idea = await prisma.idea.create({
      data: {
        title,
        description,
        category: category ?? null,
        tags,
        authorId: user.id,
        // Nested write — Prisma wraps this in an implicit transaction, so
        // the idea and its founder's team membership are created atomically.
        teamMembers: {
          create: { userId: user.id, role: 'FOUNDER' },
        },
      },
      select: IDEA_LIST_SELECT,
    });

    return NextResponse.json({ idea }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Create idea error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
