export default function IdeaDetailLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl animate-pulse px-6 py-16">
      <div className="h-3 w-20 rounded bg-line" />

      <div className="mt-6 flex items-start gap-5">
        <div className="h-24 w-10 shrink-0 rounded bg-line" />
        <div className="min-w-0 flex-1">
          <div className="h-9 w-3/4 rounded bg-line" />
          <div className="mt-4 h-3 w-1/2 rounded bg-line" />
        </div>
      </div>

      <div className="my-8 h-px w-full bg-line" />

      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-line" />
        <div className="h-4 w-full rounded bg-line" />
        <div className="h-4 w-2/3 rounded bg-line" />
      </div>

      <div className="mt-10 h-40 rounded border border-line bg-line/10" />
      <div className="mt-10 h-32 rounded border border-line bg-line/10" />
      <div className="mt-10 h-48 rounded border border-line bg-line/10" />
    </main>
  );
}
