'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CommentForm } from '@/components/CommentForm';
import { CommentThread } from '@/components/CommentThread';
import { useToast } from '@/components/ToastProvider';
import type { CommentNode } from '@/lib/comments';

type CommentSectionProps = {
  ideaId: string;
  initialComments: CommentNode[];
  initialHasMore: boolean;
  isLoggedIn: boolean;
};

function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countComments(node.replies), 0);
}

export function CommentSection({
  ideaId,
  initialComments,
  initialHasMore,
  isLoggedIn,
}: CommentSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [comments, setComments] = useState(initialComments);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // router.refresh() re-runs the Server Component and gives us a fresh
  // `initialComments` prop, but useState only reads its initializer on
  // mount — without this effect, posting a new comment wouldn't actually
  // update what's rendered. This intentionally resets any "loaded more"
  // pages back to page 1, which is fine since new comments sort newest
  // first and are always on page 1 anyway.
  useEffect(() => {
    setComments(initialComments);
    setHasMore(initialHasMore);
  }, [initialComments, initialHasMore]);

  async function loadMore() {
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/comments?ideaId=${ideaId}&skip=${comments.length}`);
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [...prev, ...data.comments]);
        setHasMore(data.hasMore);
      }
    } catch {
      showToast('Could not load more comments.', 'error');
    } finally {
      setIsLoadingMore(false);
    }
  }

  const total = countComments(comments);

  return (
    <section>
      <p className="font-mono text-xs uppercase tracking-widest text-graphite">
        {total === 0 ? 'Feedback' : `Feedback · ${total}${hasMore ? '+' : ''}`}
      </p>

      <div className="mt-4">
        {isLoggedIn ? (
          <CommentForm
            ideaId={ideaId}
            onSuccess={() => {
              showToast('Comment posted');
              router.refresh();
            }}
          />
        ) : (
          <p className="rounded border border-line px-4 py-3 text-sm text-graphite">
            <Link href="/login" className="text-signal hover:underline">
              Log in
            </Link>{' '}
            to leave feedback on this idea.
          </p>
        )}
      </div>

      <div className="mt-2">
        {comments.length === 0 ? (
          <p className="mt-6 text-center text-sm text-graphite">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              ideaId={ideaId}
              isLoggedIn={isLoggedIn}
            />
          ))
        )}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={isLoadingMore}
          className="mt-4 w-full rounded border border-line py-2 font-mono text-xs uppercase tracking-widest text-graphite transition hover:border-signal hover:text-signal disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingMore ? 'Loading…' : 'Load more comments'}
        </button>
      )}
    </section>
  );
}
