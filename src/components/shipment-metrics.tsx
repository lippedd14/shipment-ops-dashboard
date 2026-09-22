import type { ShipmentCounts } from "@/lib/metrics";

const CARDS = [
  { key: "total", label: "Total" },
  { key: "in_transit", label: "Em trânsito" },
  { key: "delivered", label: "Entregues" },
  { key: "delayed", label: "Atrasadas" },
] as const satisfies readonly { key: keyof ShipmentCounts; label: string }[];

// No shadow, no gradient, no icon: they report, the board works.
const CARD = "rounded-lg border border-line bg-surface px-4 py-3";

export function MetricCardsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando números"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {CARDS.map(({ key }) => (
        <div key={key} className={CARD}>
          <div className="h-8 w-12 rounded bg-line" />
          <div className="mt-2 h-3 w-16 rounded bg-line" />
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CARDS.map(({ key, label }) => (
        <div key={key} className={CARD}>
          {/* aria-busy rather than a skeleton swap: the previous number stays
              readable while the new one is fetched, so the card never blinks. */}
          <p
            aria-busy={pending}
            className={`tnum text-metric font-semibold text-ink ${
              pending ? "opacity-50" : ""
            }`}
          >
            {counts[key]}
          </p>
          <p className="mt-0.5 text-meta font-medium text-muted">{label}</p>
        </div>
      ))}
    </div>
  );
}
