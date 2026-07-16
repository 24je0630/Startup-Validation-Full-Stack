import Link from 'next/link';

type IdeaCardProps = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  tags: string[];
  createdAt: Date | string;
  author: { name: string };
};

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export function IdeaCard({
  id,
  title,
  description,
  category,
  tags,
  createdAt,
  author,
}: IdeaCardProps) {
  return (
    <Link
      href={`/ideas/${id}`}
      className="group block rounded border border-line p-6 transition hover:border-signal"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-paper group-hover:text-signal">
          {title}
        </h2>
        {category && (
          <span className="shrink-0 rounded border border-line px-2.5 py-1 font-mono text-xs uppercase tracking-widest text-graphite">
            {category}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-graphite">
        {truncate(description, 160)}
      </p>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-line/60 px-2.5 py-1 font-mono text-xs text-graphite"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between font-mono text-xs text-graphite">
        <span>{author.name}</span>
        <span>{new Date(createdAt).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}
