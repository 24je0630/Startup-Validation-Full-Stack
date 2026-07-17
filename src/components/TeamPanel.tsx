'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TeamMemberInfo, MyTeamStatus } from '@/lib/team';

type PendingRequest = {
  id: string;
  createdAt: string | Date;
  user: { id: string; name: string };
};

type TeamPanelProps = {
  ideaId: string;
  members: TeamMemberInfo[];
  myStatus: MyTeamStatus;
  pendingRequests: PendingRequest[]; // only populated when myStatus.kind === 'founder'
};

function RoleBadge({ role }: { role: 'FOUNDER' | 'MEMBER' }) {
  return (
    <span
      className={
        role === 'FOUNDER'
          ? 'rounded-full bg-signal/10 px-2.5 py-1 font-mono text-xs text-signal'
          : 'rounded-full bg-line/60 px-2.5 py-1 font-mono text-xs text-graphite'
      }
    >
      {role === 'FOUNDER' ? 'Founder' : 'Member'}
    </span>
  );
}

function JoinRequestControl({ ideaId, myStatus }: { ideaId: string; myStatus: MyTeamStatus }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendRequest() {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/join-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not send your request.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (myStatus.kind === 'not_logged_in') {
    return (
      <Link href="/login" className="text-sm text-signal hover:underline">
        Log in to request to join this team
      </Link>
    );
  }
  if (myStatus.kind === 'founder' || myStatus.kind === 'member') {
    return null; // no action needed — they're already on the team
  }

  return (
    <div>
      {myStatus.kind === 'request_pending' ? (
        <span className="rounded border border-line px-4 py-2 font-mono text-xs uppercase tracking-widest text-graphite">
          Request pending
        </span>
      ) : (
        <button
          type="button"
          onClick={sendRequest}
          disabled={isSubmitting}
          className="rounded bg-signal px-4 py-2.5 font-medium text-ink transition hover:bg-signal-dim disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? 'Sending…'
            : myStatus.kind === 'request_rejected'
              ? 'Request again'
              : 'Request to join'}
        </button>
      )}
      {myStatus.kind === 'request_rejected' && !isSubmitting && (
        <p className="mt-2 text-xs text-graphite">Your previous request wasn&apos;t accepted.</p>
      )}
      {error && <p className="mt-2 text-xs text-alert">{error}</p>}
    </div>
  );
}

function PendingRequestRow({ request }: { request: PendingRequest }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<'ACCEPT' | 'REJECT' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: 'ACCEPT' | 'REJECT') {
    setIsSubmitting(action);
    setError(null);
    try {
      const res = await fetch('/api/join-request/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not process this request.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded border border-line px-4 py-3">
      <div>
        <p className="text-sm text-paper">{request.user.name}</p>
        <p className="font-mono text-xs text-graphite">
          requested {new Date(request.createdAt).toLocaleDateString()}
        </p>
        {error && <p className="mt-1 text-xs text-alert">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => respond('ACCEPT')}
          disabled={isSubmitting !== null}
          className="rounded border border-signal px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-signal transition hover:bg-signal/10 disabled:opacity-60"
        >
          {isSubmitting === 'ACCEPT' ? '…' : 'Accept'}
        </button>
        <button
          type="button"
          onClick={() => respond('REJECT')}
          disabled={isSubmitting !== null}
          className="rounded border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-graphite transition hover:border-alert hover:text-alert disabled:opacity-60"
        >
          {isSubmitting === 'REJECT' ? '…' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

export function TeamPanel({ ideaId, members, myStatus, pendingRequests }: TeamPanelProps) {
  return (
    <div className="rounded border border-line p-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-graphite">
          Team · {members.length}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between">
            <span className="text-sm text-paper">{member.user.name}</span>
            <RoleBadge role={member.role} />
          </div>
        ))}
      </div>

      <div className="mt-5">
        <JoinRequestControl ideaId={ideaId} myStatus={myStatus} />
      </div>

      {myStatus.kind === 'founder' && (
        <div className="mt-6 border-t border-line pt-5">
          <p className="font-mono text-xs uppercase tracking-widest text-graphite">
            {pendingRequests.length === 0
              ? 'No pending requests'
              : `Pending requests · ${pendingRequests.length}`}
          </p>
          <div className="mt-3 space-y-2">
            {pendingRequests.map((request) => (
              <PendingRequestRow key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
