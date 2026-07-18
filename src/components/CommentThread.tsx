'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CommentForm } from '@/components/CommentForm';
import { useToast } from '@/components/ToastProvider';
import type { CommentNode } from '@/lib/comments';

type CommentThreadProps = {
  comment: CommentNode;
  ideaId: string;
  isLoggedIn: boolean;
  depth?: number;
};

// Cap visual indentation so a very deep reply chain doesn't push content
// off-screen on narrow viewports.
const MAX_INDENT_DEPTH = 4;

export function CommentThread({
  comment,
  ideaId,
  isLoggedIn,
  depth = 0,
}: CommentThreadProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isReplying, setIsReplying] = useState(false);
  const shouldIndent = depth > 0 && depth <= MAX_INDENT_DEPTH;

  return (
    <div className={shouldIndent ? 'mt-4 border-l border-line pl-4' : 'mt-4'}>
      <div className="flex items-baseline gap-3 font-mono text-xs text-graphite">
        <span className="text-paper">{comment.author.name}</span>
        <span>{new Date(comment.createdAt).toLocaleString()}</span>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-paper">
        {comment.content}
      </p>

      <div className="mt-1.5">
        {isLoggedIn ? (
          !isReplying && (
            <button
              type="button"
              onClick={() => setIsReplying(true)}
              className="font-mono text-xs uppercase tracking-widest text-graphite hover:text-signal"
            >
              Reply
            </button>
          )
        ) : (
          <Link
            href="/login"
            className="font-mono text-xs uppercase tracking-widest text-graphite hover:text-signal"
          >
            Log in to reply
          </Link>
        )}
      </div>

      {isReplying && (
        <div className="mt-3">
          <CommentForm
            ideaId={ideaId}
            parentId={comment.id}
            placeholder={`Reply to ${comment.author.name}…`}
            autoFocus
            onCancel={() => setIsReplying(false)}
            onSuccess={() => {
              setIsReplying(false);
              showToast('Reply posted');
              // Comments are a low-frequency, non-latency-critical action —
              // re-fetching the Server Component tree keeps the nested
              // reply structure correct without duplicating tree-merge
              // logic on the client.
              router.refresh();
            }}
          />
        </div>
      )}

      {comment.replies.map((reply) => (
        <CommentThread
          key={reply.id}
          comment={reply}
          ideaId={ideaId}
          isLoggedIn={isLoggedIn}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
