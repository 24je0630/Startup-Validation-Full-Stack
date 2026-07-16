'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="rounded border border-line px-4 py-2 font-mono text-xs uppercase tracking-widest text-graphite transition hover:border-alert hover:text-alert disabled:opacity-60"
    >
      {isLoggingOut ? 'Logging out…' : 'Log out'}
    </button>
  );
}
