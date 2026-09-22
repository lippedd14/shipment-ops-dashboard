import { MetricCardsSkeleton } from "@/components/shipment-metrics";

/** Skeleton shown while the dashboard's data is fetched on the server. */
export default function DashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-6 w-32 rounded bg-line" />
          <div className="h-3 w-44 rounded bg-line" />
        </div>
        <div className="h-8 w-52 rounded bg-line" />
      </div>

      <MetricCardsSkeleton />

      <div className="h-10 rounded-md bg-line" />

      <div
        role="status"
        aria-label="Carregando remessas"
        className="grid gap-3 md:grid-cols-3"
      >
        {[0, 1, 2].map((column) => (
          <div
            key={column}
            className="flex flex-col gap-2 rounded-lg border border-line bg-paper p-2"
          >
            {[0, 1, 2].map((card) => (
              <div key={card} className="h-24 rounded-md bg-line" />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
