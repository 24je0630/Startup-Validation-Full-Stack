'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CommentForm } from '@/components/CommentForm';
import { CommentThread } from '@/components/CommentThread';
import type { CommentNode } from '@/lib/comments';

type CommentSectionProps = {
  ideaId: string;
  comments: CommentNode[];
  isLoggedIn: boolean;
};

function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countComments(node.replies), 0);
}

export function CommentSection({ ideaId, comments, isLoggedIn }: CommentSectionProps) {
  const router = useRouter();
  const total = countComments(comments);

  return (
    <section>
      <p className="font-mono text-xs uppercase tracking-widest text-graphite">
        {total === 0 ? 'Feedback' : `Feedback · ${total}`}
      </p>

      <div className="mt-4">
        {isLoggedIn ? (
          <CommentForm ideaId={ideaId} onSuccess={() => router.refresh()} />
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
    </section>
  );
}
