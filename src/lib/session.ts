import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/jwt';

/** Public-safe user shape — password hash is never included. */
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  credits: number;
  createdAt: Date;
};

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  credits: true,
  createdAt: true,
} as const;

/**
 * Reads the session cookie (server-side only — Server Components,
 * Route Handlers, Server Actions), verifies it, and loads the user.
 * Returns null if there's no valid session.
 */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: PUBLIC_USER_SELECT,
  });

  return user;
}
