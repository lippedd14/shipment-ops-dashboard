import type { ShipmentCounts } from "@/lib/metrics";

const CARDS = [
  { key: "total", label: "Total" },
  { key: "in_transit", label: "Em trânsito" },
  { key: "delivered", label: "Entregues" },
  { key: "delayed", label: "Atrasadas" },
] as const satisfies readonly { key: keyof ShipmentCounts; label: string }[];

const cardClass =
  "rounded-lg border border-black/10 px-4 py-3 dark:border-white/15";

export function MetricCardsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando métricas"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {CARDS.map(({ key }) => (
        <div key={key} className={cardClass}>
          <div className="h-4 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-8 w-12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function MetricCards({
  counts,
  pending,
}: {
  counts: ShipmentCounts;
  pending: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${
        pending ? "opacity-60" : ""
      }`}
    >
      {CARDS.map(({ key, label }) => (
        <div key={key} className={cardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            {label}
          </p>
          {/* aria-busy rather than a swapped skeleton: the previous number stays
              readable while the new one is being fetched. */}
          <p
            aria-busy={pending}
            className="mt-1 text-3xl font-semibold tabular-nums"
          >
            {counts[key]}
          </p>
        </div>
      ))}
    </div>
  );
}
