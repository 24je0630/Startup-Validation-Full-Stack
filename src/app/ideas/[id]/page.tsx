import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function IdeaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const idea = await prisma.idea.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      category: true,
      isPublic: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });

  if (!idea || !idea.isPublic) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <Link href="/ideas" className="font-mono text-xs uppercase tracking-widest text-graphite hover:text-signal">
        ← All ideas
      </Link>

      <div className="mt-6 flex items-start justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-paper sm:text-4xl">
          {idea.title}
        </h1>
        {idea.category && (
          <span className="shrink-0 rounded border border-line px-2.5 py-1 font-mono text-xs uppercase tracking-widest text-graphite">
            {idea.category}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 font-mono text-xs text-graphite">
        <span>by {idea.author.name}</span>
        <span>·</span>
        <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
      </div>

      {idea.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {idea.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-line/60 px-2.5 py-1 font-mono text-xs text-graphite"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="signal-divider my-8 w-full" />

      <p className="whitespace-pre-wrap leading-relaxed text-paper">
        {idea.description}
      </p>

      <div className="mt-12 rounded border border-line px-6 py-8 text-center font-mono text-xs text-graphite">
        voting · virtual investment · feedback — arriving in Phase 4 &amp; 5
      </div>
    </main>
  );
}
