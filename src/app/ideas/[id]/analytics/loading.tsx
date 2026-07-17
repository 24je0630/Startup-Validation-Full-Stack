export default function AnalyticsLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl animate-pulse px-6 py-16">
      <div className="h-3 w-24 rounded bg-line" />
      <div className="mt-6 h-3 w-32 rounded bg-line" />
      <div className="mt-3 h-8 w-64 rounded bg-line" />
      <div className="mt-3 h-3 w-48 rounded bg-line" />

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded border border-line bg-line/20" />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded border border-line bg-line/20" />
        ))}
      </div>

      <div className="mt-10 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-72 rounded border border-line bg-line/10" />
        ))}
      </div>
    </main>
  );
}
