import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { NotificationBell } from '@/components/NotificationBell';
import { LogoutButton } from '@/components/LogoutButton';

export async function Navbar() {
  const user = await getCurrentUser();

  const [notifications, unreadCount] = user
    ? await Promise.all([
        prisma.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.notification.count({ where: { userId: user.id, read: false } }),
      ])
    : [[], 0];

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg font-bold text-paper">
          signal
        </Link>

        <nav className="flex items-center gap-5">
          <Link
            href="/ideas"
            className="font-mono text-xs uppercase tracking-widest text-graphite transition hover:text-signal"
          >
            Ideas
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="font-mono text-xs uppercase tracking-widest text-graphite transition hover:text-signal"
              >
                Dashboard
              </Link>
              <NotificationBell
                initialNotifications={notifications}
                initialUnreadCount={unreadCount}
              />
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="font-mono text-xs uppercase tracking-widest text-graphite transition hover:text-signal"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded bg-signal px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ink transition hover:bg-signal-dim"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
