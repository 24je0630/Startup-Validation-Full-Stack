export default function IdeasLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl animate-pulse px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="h-3 w-24 rounded bg-line" />
          <div className="mt-3 h-8 w-72 rounded bg-line" />
        </div>
        <div className="h-10 w-32 shrink-0 rounded bg-line" />
      </div>

      <div className="my-8 h-px w-full bg-line" />

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded border border-line bg-line/10" />
        ))}
      </div>
    </main>
  );
}
