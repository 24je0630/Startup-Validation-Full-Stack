import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

const respondSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(['ACCEPT', 'REJECT']),
});

/** POST /api/join-request/respond — accept or reject a join request. Founder only. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  try {
    const { requestId, action } = respondSchema.parse(await request.json());

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, userId: true, ideaId: true, idea: { select: { authorId: true } } },
    });
    if (!joinRequest) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }
    if (joinRequest.idea.authorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the founder can respond to join requests.' },
        { status: 403 }
      );
    }
    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This request has already been handled.' },
        { status: 409 }
      );
    }

    if (action === 'REJECT') {
      await prisma.joinRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });
      return NextResponse.json({ success: true, status: 'REJECTED' });
    }

    // ACCEPT — flip the request and create the team membership atomically.
    await prisma.$transaction([
      prisma.joinRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      }),
      prisma.teamMember.create({
        data: { userId: joinRequest.userId, ideaId: joinRequest.ideaId, role: 'MEMBER' },
      }),
    ]);

    return NextResponse.json({ success: true, status: 'ACCEPTED' });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Respond to join request error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
