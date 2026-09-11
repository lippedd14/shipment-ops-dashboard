import Link from "next/link";

import { DeleteShipmentButton } from "@/components/delete-shipment-button";
import { STATUS_LABELS, type Shipment } from "@/lib/validation/shipment";

const th =
  "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50";
const td = "px-3 py-2 align-middle";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

/** "Nothing matched" and "nothing exists yet" call for different next steps. */
function EmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="rounded-lg border border-dashed border-black/15 px-6 py-12 text-center dark:border-white/20">
        <p className="text-sm font-medium">Nenhuma remessa encontrada.</p>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Nenhuma remessa corresponde aos filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-black/15 px-6 py-12 text-center dark:border-white/20">
      <p className="text-sm font-medium">Nenhuma remessa ainda.</p>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Cadastre a primeira para come&ccedil;ar a acompanhar.
      </p>
      <Link
        href="/dashboard/new"
        className="mt-4 inline-block rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Nova remessa
      </Link>
    </div>
  );
}

/** Presentational: rows and ordering are decided by the dashboard island. */
export function ShipmentsList({
  shipments,
  filtered,
}: {
  shipments: Shipment[];
  filtered: boolean;
}) {
  if (shipments.length === 0) {
    return <EmptyState filtered={filtered} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead className="border-b border-black/10 dark:border-white/15">
          <tr>
            <th scope="col" className={th}>
              C&oacute;digo
            </th>
            <th scope="col" className={th}>
              Origem
            </th>
            <th scope="col" className={th}>
              Destino
            </th>
            <th scope="col" className={th}>
              Transportadora
            </th>
            <th scope="col" className={th}>
              Status
            </th>
            <th scope="col" className={th}>
              Criada em
            </th>
            <th scope="col" className={th}>
              Atualizada em
            </th>
            <th scope="col" className={`${th} text-right`}>
              A&ccedil;&otilde;es
            </th>
          </tr>
        </thead>
        <tbody>
          {shipments.map((shipment) => (
            <tr
              key={shipment.id}
              className="border-b border-black/5 last:border-0 dark:border-white/10"
            >
              <td className={`${td} font-medium`}>{shipment.tracking_code}</td>
              <td className={td}>{shipment.origin}</td>
              <td className={td}>{shipment.destination}</td>
              <td className={td}>{shipment.carrier}</td>
              <td className={td}>{STATUS_LABELS[shipment.status]}</td>
              <td
                className={`${td} whitespace-nowrap text-black/60 dark:text-white/60`}
              >
                {dateFormatter.format(new Date(shipment.created_at))}
              </td>
              <td
                className={`${td} whitespace-nowrap text-black/60 dark:text-white/60`}
              >
                {dateFormatter.format(new Date(shipment.updated_at))}
              </td>
              <td className={`${td} text-right`}>
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/dashboard/${shipment.id}/edit`}
                    className="rounded-md border border-black/15 px-2 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
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
  );
}
