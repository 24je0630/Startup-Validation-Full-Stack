import { prisma } from '@/lib/prisma';

type NotifyArgs = {
  /** Who receives the notification. */
  userId: string;
  /** Who performed the triggering action, if any. If it's the same person
   *  as `userId`, no notification is created — you don't need to be told
   *  about your own actions. */
  actorId?: string;
  message: string;
  link?: string;
};

/**
 * Creates a notification, unless the actor and recipient are the same
 * person. Never throws — a notification failing to save should never break
 * the vote/comment/investment/join-request it's attached to, so callers
 * fire this after their main mutation succeeds and don't await failure
 * handling beyond a log line.
 */
export async function notify({ userId, actorId, message, link }: NotifyArgs): Promise<void> {
  if (actorId && actorId === userId) return;

  try {
    await prisma.notification.create({ data: { userId, message, link } });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
