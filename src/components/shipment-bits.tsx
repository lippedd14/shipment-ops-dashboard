import { STAGE_LABELS, type Stage } from "@/lib/validation/shipment";

const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

const fullDate = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatShort(value: string) {
  return shortDate.format(new Date(value));
}

export function formatFull(value: string) {
  return fullDate.format(new Date(value));
}

const DOT_COLOR: Record<Stage, string> = {
  pending: "bg-stage-pending",
  in_transit: "bg-stage-transit",
  delivered: "bg-stage-delivered",
};

/**
 * Colour rides on the dot, never on the label.
 *
 * The delivered green does not clear AA as text on white, and a coloured pill
 * would shout louder than the live indicator, which is the one thing allowed to.
 */
export function StageMark({ stage }: { stage: Stage }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-ink">
      <span
        className={`size-1.5 shrink-0 rounded-full ${DOT_COLOR[stage]}`}
        aria-hidden
      />
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function DelayedTag() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-meta font-medium text-delayed">
      <span aria-hidden>▲</span>
      Atrasada
    </span>
  );
}
