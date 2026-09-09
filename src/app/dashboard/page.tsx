import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { DeleteShipmentButton } from "@/components/delete-shipment-button";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, type Shipment } from "@/lib/validation/shipment";

export const metadata: Metadata = {
  title: "Dashboard",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50";
const td = "px-3 py-2 align-middle";

function ShipmentsTable({ shipments }: { shipments: Shipment[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead className="border-b border-black/10 dark:border-white/15">
          <tr>
            <th scope="col" className={th}>Código</th>
            <th scope="col" className={th}>Origem</th>
            <th scope="col" className={th}>Destino</th>
            <th scope="col" className={th}>Transportadora</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={th}>Criada em</th>
            <th scope="col" className={th}>Atualizada em</th>
            <th scope="col" className={`${th} text-right`}>Ações</th>
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
              <td className={`${td} whitespace-nowrap text-black/60 dark:text-white/60`}>
                {formatDate(shipment.created_at)}
              </td>
              <td className={`${td} whitespace-nowrap text-black/60 dark:text-white/60`}>
                {formatDate(shipment.updated_at)}
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

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-black/15 px-6 py-12 text-center dark:border-white/20">
      <p className="text-sm font-medium">Nenhuma remessa ainda.</p>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Cadastre a primeira para começar a acompanhar.
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

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false });

  // Thrown so the nearest error boundary renders, instead of showing an empty
  // table that would read as "you have no shipments".
  if (error) {
    throw new Error(`Não foi possível carregar as remessas: ${error.message}`);
  }

  const shipments: Shipment[] = data ?? [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Remessas</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Conectado como <span className="font-medium">{user.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/new"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Nova remessa
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {shipments.length === 0 ? (
        <EmptyState />
      ) : (
        <ShipmentsTable shipments={shipments} />
      )}
    </main>
  );
}
