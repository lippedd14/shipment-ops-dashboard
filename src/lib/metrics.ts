import type { ShipmentStatus } from "@/lib/validation/shipment";

/** Statuses that get a card of their own, next to the total. */
export const METRIC_STATUSES = [
  "in_transit",
  "delivered",
  "delayed",
] as const satisfies readonly ShipmentStatus[];

export type MetricStatus = (typeof METRIC_STATUSES)[number];

export type ShipmentCounts = {
  total: number;
} & Record<MetricStatus, number>;

export const ZERO_COUNTS: ShipmentCounts = {
  total: 0,
  in_transit: 0,
  delivered: 0,
  delayed: 0,
};

function isMetricStatus(status: ShipmentStatus): status is MetricStatus {
  return (METRIC_STATUSES as readonly ShipmentStatus[]).includes(status);
}

/**
 * Adds or removes one shipment from the counts.
 *
 * Realtime events adjust the server's numbers instead of recounting, so the
 * cards stay correct once the list is paginated and the client no longer holds
 * every row. Clamped at zero: a missed event should not render a negative card.
 */
export function applyCountDelta(
  counts: ShipmentCounts,
  status: ShipmentStatus,
  delta: number,
): ShipmentCounts {
  const next: ShipmentCounts = {
    ...counts,
    total: Math.max(0, counts.total + delta),
  };
  if (isMetricStatus(status)) {
    next[status] = Math.max(0, counts[status] + delta);
  }
  return next;
}
