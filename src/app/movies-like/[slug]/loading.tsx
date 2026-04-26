export default function MovieLikeLoading() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="h-6 w-28 rounded bg-white/10 animate-pulse mb-4" />
        <div className="h-10 max-w-xl rounded-lg bg-white/10 animate-pulse mb-8" />
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <div className="aspect-[2/3] max-w-[220px] mx-auto lg:mx-0 rounded-xl bg-white/10 animate-pulse" />
          <div className="space-y-3">
            <div className="h-6 w-40 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-full max-w-md rounded bg-white/5 animate-pulse" />
            <div className="h-4 w-full max-w-sm rounded bg-white/5 animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-64 rounded-lg bg-white/10 animate-pulse mt-14 mb-8" />
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}
