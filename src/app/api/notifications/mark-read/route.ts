import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

const markReadSchema = z.object({
  notificationId: z.string().min(1).optional(),
});

/**
 * POST /api/notifications/mark-read — body `{ notificationId? }`.
 * With an id, marks that one notification read (after verifying it
 * belongs to the caller — you can't mark someone else's notification).
 * Without an id, marks ALL of the caller's notifications read.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  try {
    const { notificationId } = markReadSchema.parse(await request.json().catch(() => ({})));

    if (notificationId) {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        select: { userId: true },
      });
      if (!notification || notification.userId !== user.id) {
        return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
      }
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Mark notification read error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
