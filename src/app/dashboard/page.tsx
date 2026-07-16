import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { LogoutButton } from '@/components/LogoutButton';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Belt-and-suspenders: middleware already redirects unauthenticated
  // requests, but a Server Component should never trust that alone.
  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm uppercase tracking-widest text-signal">
            signal · dashboard
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-paper">
            Welcome, {user.name.split(' ')[0]}
          </h1>
        </div>
        <LogoutButton />
      </div>

      <div className="signal-divider my-8 w-full" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded border border-line p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-graphite">
            Account
          </p>
          <p className="mt-2 text-paper">{user.email}</p>
        </div>
        <div className="rounded border border-line p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-graphite">
            Virtual credits
          </p>
          <p className="mt-2 font-mono text-2xl text-signal">{user.credits}</p>
        </div>
        <div className="rounded border border-line p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-graphite">
            Member since
          </p>
          <p className="mt-2 text-paper">
            {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <p className="mt-10 font-mono text-xs text-graphite">
        idea posting · voting · analytics — arriving in later phases
      </p>
    </main>
  );
}
