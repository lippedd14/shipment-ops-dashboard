/** Skeleton shown while the dashboard's data is fetched on the server. */
export default function DashboardLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-56 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      </div>

      <div
        role="status"
        aria-label="Carregando remessas"
        className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/15"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded bg-black/5 dark:bg-white/5"
          />
        ))}
      </div>
    </main>
  );
}
