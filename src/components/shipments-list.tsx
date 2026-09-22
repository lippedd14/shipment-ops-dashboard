import Link from "next/link";

import { DeleteShipmentButton } from "@/components/delete-shipment-button";
import {
  DelayedTag,
  StageMark,
  formatFull,
  formatShort,
} from "@/components/shipment-bits";
import { BTN_SMALL } from "@/components/ui";
import { stageOf, type Shipment } from "@/lib/validation/shipment";

const TH =
  "sticky top-0 z-10 bg-surface px-3 py-2 text-left text-meta font-medium text-muted";
const TD = "px-3 py-2.5 align-middle text-body text-ink";

/**
 * The wrapper scrolls on both axes on purpose.
 *
 * A container with overflow on one axis becomes a scroll context on both, and a
 * sticky header would then stick to that container instead of the viewport. So
 * the table gets its own height and its header stays put inside it.
 */
export function ShipmentsTable({
  shipments,
  flashedIds,
}: {
  shipments: Shipment[];
  flashedIds: ReadonlySet<string>;
}) {
  return (
    <>
      <div className="hidden max-h-[60vh] overflow-auto rounded-lg border border-line bg-surface md:block">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={TH}>
                Código
              </th>
              <th scope="col" className={TH}>
                Origem
              </th>
              <th scope="col" className={TH}>
                Destino
              </th>
              <th scope="col" className={TH}>
                Transportadora
              </th>
              <th scope="col" className={TH}>
                Etapa
              </th>
              <th scope="col" className={TH}>
                Criada
              </th>
              <th scope="col" className={TH}>
                Atualizada
              </th>
              <th scope="col" className={`${TH} text-right`}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((shipment) => (
              <tr
                key={shipment.id}
                className={`border-b border-line last:border-0 ${
                  flashedIds.has(shipment.id) ? "row-flash" : ""
                }`}
              >
                <td className={`${TD} font-medium`}>
                  <span className="flex items-center gap-2">
                    {shipment.tracking_code}
                    {shipment.is_delayed ? <DelayedTag /> : null}
                  </span>
                </td>
                <td className={TD}>{shipment.origin}</td>
                <td className={TD}>{shipment.destination}</td>
                <td className={TD}>{shipment.carrier}</td>
                <td className={TD}>
                  <StageMark stage={stageOf(shipment)} />
                </td>
                <td className={`${TD} tnum whitespace-nowrap text-muted`}>
                  {formatShort(shipment.created_at)}
                </td>
                <td className={`${TD} tnum whitespace-nowrap text-muted`}>
                  {formatShort(shipment.updated_at)}
                </td>
                <td className={`${TD} text-right`}>
                  <div
                    data-row-actions
                    className="flex items-center justify-end gap-2"
                  >
                    <Link
                      href={`/dashboard/${shipment.id}/edit`}
                      className={BTN_SMALL}
                    >
                      Editar
                    </Link>
                    <DeleteShipmentButton
                      id={shipment.id}
                      trackingCode={shipment.tracking_code}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Below 768px a row cannot hold eight columns, so each shipment becomes
          a card and the actions stay visible. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {shipments.map((shipment) => (
          <li
            key={shipment.id}
            className={`rounded-lg border border-line bg-surface p-3 ${
              flashedIds.has(shipment.id) ? "row-flash" : ""
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
            <div className="mt-2 flex items-center justify-between gap-2 text-meta">
              <StageMark stage={stageOf(shipment)} />
              <span className="tnum text-muted">
                {formatFull(shipment.updated_at)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Link
                href={`/dashboard/${shipment.id}/edit`}
                className={BTN_SMALL}
              >
                Editar
              </Link>
              <DeleteShipmentButton
                id={shipment.id}
                trackingCode={shipment.tracking_code}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
