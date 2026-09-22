import { stageOf, type Shipment } from "@/lib/validation/shipment";

export type ShipmentCounts = {
  total: number;
  in_transit: number;
  delivered: number;
  delayed: number;
};

export const ZERO_COUNTS: ShipmentCounts = {
  total: 0,
  in_transit: 0,
  delivered: 0,
  delayed: 0,
};

/**
 * Adds or removes one shipment from the counts.
 *
 * Realtime events adjust the server's numbers instead of recounting, so the
 * cards stay correct once the list is paginated and the client no longer holds
 * every row. Clamped at zero: a missed event should not render a negative card.
 *
 * Delay is counted independently of stage, so a late shipment in transit
 * increments both.
 */
export function applyRowDelta(
  counts: ShipmentCounts,
  shipment: Shipment,
  delta: number,
): ShipmentCounts {
  const stage = stageOf(shipment);
  const next: ShipmentCounts = {
    ...counts,
    total: Math.max(0, counts.total + delta),
  };

  if (stage === "in_transit" || stage === "delivered") {
    next[stage] = Math.max(0, counts[stage] + delta);
  }
  if (shipment.is_delayed) {
    next.delayed = Math.max(0, counts.delayed + delta);
  }
  return next;
}
