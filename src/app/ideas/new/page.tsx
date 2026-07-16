'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createIdeaSchema } from '@/lib/validation';
import { IDEA_CATEGORIES } from '@/lib/constants';

export default function NewIdeaPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const parsed = createIdeaSchema.safeParse({
      title,
      description,
      category: category || undefined,
      tags,
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid input');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      router.push(`/ideas/${data.idea.id}`);
      router.refresh();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <p className="font-mono text-sm uppercase tracking-widest text-signal">
        signal · post an idea
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-paper">
        What are you validating?
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-widest text-graphite">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A one-line pitch"
            required
            className="mt-2 w-full rounded border border-line bg-transparent px-4 py-2.5 text-paper placeholder:text-graphite/60 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
          />
        </label>

        <label className="block">
          <span className="font-mono text-xs uppercase tracking-widest text-graphite">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What problem does this solve? Who is it for? Why now?"
            required
            rows={7}
            className="mt-2 w-full resize-y rounded border border-line bg-transparent px-4 py-2.5 text-paper placeholder:text-graphite/60 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
          />
        </label>

        <label className="block">
          <span className="font-mono text-xs uppercase tracking-widest text-graphite">
            Category
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-2 w-full rounded border border-line bg-ink px-4 py-2.5 text-paper focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
          >
            <option value="">No category</option>
            {IDEA_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-mono text-xs uppercase tracking-widest text-graphite">
            Tags <span className="normal-case text-graphite/70">(comma-separated, up to 5)</span>
          </span>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="ai, marketplace, b2b"
            className="mt-2 w-full rounded border border-line bg-transparent px-4 py-2.5 text-paper placeholder:text-graphite/60 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
          />
        </label>

        {error && (
          <p className="rounded border border-alert/40 bg-alert/10 px-4 py-2.5 text-sm text-alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-signal px-4 py-2.5 font-medium text-ink transition hover:bg-signal-dim disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Posting…' : 'Post idea'}
        </button>
      </form>
    </main>
  );
}
