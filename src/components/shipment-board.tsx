"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import {
  moveShipmentStage,
  type RowActionState,
} from "@/app/dashboard/actions";
import { DeleteShipmentButton } from "@/components/delete-shipment-button";
import { DelayedTag, formatShort } from "@/components/shipment-bits";
import { BTN_SMALL } from "@/components/ui";
import {
  STAGES,
  STAGE_LABELS,
  stageOf,
  type Shipment,
  type Stage,
} from "@/lib/validation/shipment";

const initialState: RowActionState = {};

function MoveSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={BTN_SMALL}>
      {pending ? "Movendo…" : label}
    </button>
  );
}

function MoveButton({
  id,
  to,
  label,
}: {
  id: string;
  to: Stage;
  label: string;
}) {
  const [state, formAction] = useFormState(moveShipmentStage, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="stage" value={to} />
      <MoveSubmit label={label} />
      {state.error ? (
        <p role="alert" className="mt-1 text-meta text-delayed">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function Card({
  shipment,
  flashed,
}: {
  shipment: Shipment;
  flashed: boolean;
}) {
  const stage = stageOf(shipment);
  const index = STAGES.indexOf(stage);
  const previous = index > 0 ? STAGES[index - 1] : undefined;
  const next = index < STAGES.length - 1 ? STAGES[index + 1] : undefined;

  return (
    <li
      className={`rounded-md border border-line bg-surface p-3 ${
        flashed ? "row-flash" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-body font-medium text-ink">
          {shipment.tracking_code}
        </span>
        {shipment.is_delayed ? <DelayedTag /> : null}
      </div>

      <p className="mt-1 text-body text-ink">
        {shipment.origin} → {shipment.destination}
      </p>
      <p className="text-meta text-muted">{shipment.carrier}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="tnum text-meta text-muted">
          {formatShort(shipment.created_at)}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {previous ? (
            <MoveButton
              id={shipment.id}
              to={previous}
              label={`← ${STAGE_LABELS[previous]}`}
            />
          ) : null}
          {next ? (
            <MoveButton
              id={shipment.id}
              to={next}
              label={`${STAGE_LABELS[next]} →`}
            />
          ) : null}
          <Link href={`/dashboard/${shipment.id}/edit`} className={BTN_SMALL}>
            Editar
          </Link>
          <DeleteShipmentButton
            id={shipment.id}
            trackingCode={shipment.tracking_code}
          />
        </div>
      </div>
    </li>
  );
}

export function ShipmentBoard({
  shipments,
  flashedIds,
}: {
  shipments: Shipment[];
  flashedIds: ReadonlySet<string>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {STAGES.map((stage) => {
        const column = shipments.filter(
          (shipment) => stageOf(shipment) === stage,
        );

        return (
          <section
            key={stage}
            aria-label={STAGE_LABELS[stage]}
            className="flex min-w-0 flex-col rounded-lg border border-line bg-paper"
          >
            <header className="flex items-center justify-between border-b border-line px-3 py-2">
              <h2 className="text-body font-medium text-ink">
                {STAGE_LABELS[stage]}
              </h2>
              <span className="tnum text-meta font-medium text-muted">
                {column.length}
              </span>
            </header>

            {/* Each column scrolls on its own so one busy stage cannot push the
                others off screen. */}
            <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-2">
              {column.length === 0 ? (
                <li className="px-1 py-6 text-center text-meta text-muted">
                  Nada nesta etapa.
                </li>
              ) : (
                column.map((shipment) => (
                  <Card
                    key={shipment.id}
                    shipment={shipment}
                    flashed={flashedIds.has(shipment.id)}
                  />
                ))
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
