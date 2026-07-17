import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

const joinRequestSchema = z.object({ ideaId: z.string().min(1) });

/**
 * POST /api/join-request — send (or re-send after a rejection) a request
 * to join an idea's team. Auth required.
 *
 * A user has exactly one JoinRequest row per idea for its lifetime — see
 * the schema comment on JoinRequest for the full rationale. This route
 * enforces that: PENDING/ACCEPTED blocks a new request, REJECTED resets
 * the same row back to PENDING, and no row at all creates a fresh one.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'You must be logged in to request to join a team.' },
      { status: 401 }
    );
  }

  try {
    const { ideaId } = joinRequestSchema.parse(await request.json());

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, isPublic: true, authorId: true },
    });
    if (!idea || !idea.isPublic) {
      return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }
    if (idea.authorId === user.id) {
      return NextResponse.json(
        { error: 'You already founded this idea.' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingMembership = await tx.teamMember.findUnique({
        where: { userId_ideaId: { userId: user.id, ideaId } },
      });
      if (existingMembership) {
        return { conflict: 'You are already on this team.' };
      }

      const existingRequest = await tx.joinRequest.findUnique({
        where: { userId_ideaId: { userId: user.id, ideaId } },
      });

      if (!existingRequest) {
        await tx.joinRequest.create({
          data: { userId: user.id, ideaId, status: 'PENDING' },
        });
        return { conflict: null };
      }

      if (existingRequest.status === 'REJECTED') {
        await tx.joinRequest.update({
          where: { id: existingRequest.id },
          data: { status: 'PENDING' },
        });
        return { conflict: null };
      }

      // PENDING or ACCEPTED — nothing to do, this is a duplicate attempt.
      return {
        conflict:
          existingRequest.status === 'PENDING'
            ? 'You already have a pending request for this idea.'
            : 'Your request for this idea was already accepted.',
      };
    });

    if (result.conflict) {
      return NextResponse.json({ error: result.conflict }, { status: 409 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Join request error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

/** GET /api/join-request?ideaId=... — founder only. */
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
    select: { authorId: true },
  });
  if (!idea) {
    return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
  }
  if (idea.authorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the founder can view join requests.' },
      { status: 403 }
    );
  }

  const requests = await prisma.joinRequest.findMany({
    where: { ideaId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ requests });
}
