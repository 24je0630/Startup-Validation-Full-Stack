'use client';

import { useState, FormEvent } from 'react';

type CommentFormProps = {
  ideaId: string;
  parentId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
};

export function CommentForm({
  ideaId,
  parentId,
  placeholder = 'Share your feedback…',
  autoFocus = false,
  onSuccess,
  onCancel,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (content.trim().length === 0) {
      setError('Comment cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, content, parentId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not post your comment.');
        return;
      }

      setContent('');
      onSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={parentId ? 2 : 3}
        maxLength={2000}
        className="w-full resize-y rounded border border-line bg-transparent px-4 py-2.5 text-sm text-paper placeholder:text-graphite/60 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
      />
      {error && <p className="text-xs text-alert">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-signal px-4 py-2 font-mono text-xs uppercase tracking-widest text-ink transition hover:bg-signal-dim disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="font-mono text-xs uppercase tracking-widest text-graphite hover:text-paper"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
