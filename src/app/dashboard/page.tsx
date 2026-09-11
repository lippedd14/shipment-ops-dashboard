import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { signOut } from "@/app/auth/actions";
import { ShipmentsDashboard } from "@/components/shipments-dashboard";
import type { Database } from "@/lib/database.types";
import { METRIC_STATUSES, type ShipmentCounts } from "@/lib/metrics";
import { AUTH_UNAVAILABLE_MESSAGE, checkUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  buildSearchOrFilter,
  parseFilters,
  STATUS_ALL,
  type SearchParams,
  type ShipmentFilters,
} from "@/lib/validation/filters";
import type { Shipment, ShipmentStatus } from "@/lib/validation/shipment";

export const metadata: Metadata = {
  title: "Dashboard",
};

type Client = SupabaseClient<Database>;

/**
 * Counts under the active filters, so a card never reports a wider set than the
 * table below it. head: true asks Postgres for the number only, with no rows on
 * the wire.
 */
async function countShipments(
  supabase: Client,
  filters: ShipmentFilters,
  status?: ShipmentStatus,
): Promise<number> {
  let query = supabase
    .from("shipments")
    .select("*", { count: "exact", head: true });

  if (filters.status !== STATUS_ALL) {
    query = query.eq("status", filters.status);
  }
  if (status !== undefined) {
    query = query.eq("status", status);
  }
  if (filters.query !== "") {
    query = query.or(buildSearchOrFilter(filters.query));
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(`Não foi possível calcular as métricas: ${error.message}`);
  }
  return count ?? 0;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseFilters(searchParams);
  const supabase = createClient();
  const auth = await checkUser(supabase);

  if (auth.status === "unauthenticated") {
    redirect("/login");
  }
  // Surfaced by the error boundary, which offers a retry. Redirecting to /login
  // here would claim the session ended when it only could not be verified.
  if (auth.status === "unavailable") {
    throw new Error(AUTH_UNAVAILABLE_MESSAGE);
  }
  const user = auth.user;

  // Filtering happens here, in the query, not on the client: the browser only
  // ever receives the rows for the current view.
  let listQuery = supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status !== STATUS_ALL) {
    listQuery = listQuery.eq("status", filters.status);
  }
  if (filters.query !== "") {
    listQuery = listQuery.or(buildSearchOrFilter(filters.query));
  }

  const [listResult, total, ...statusCounts] = await Promise.all([
    listQuery,
    countShipments(supabase, filters),
    ...METRIC_STATUSES.map((status) =>
      countShipments(supabase, filters, status),
    ),
  ]);

  // Thrown so the nearest error boundary renders, instead of showing an empty
  // table that would read as "you have no shipments".
  if (listResult.error) {
    throw new Error(
      `Não foi possível carregar as remessas: ${listResult.error.message}`,
    );
  }

  const shipments: Shipment[] = listResult.data ?? [];
  const counts: ShipmentCounts = {
    total,
    in_transit: statusCounts[0] ?? 0,
    delivered: statusCounts[1] ?? 0,
    delayed: statusCounts[2] ?? 0,
  };

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

      <ShipmentsDashboard
        initialShipments={shipments}
        initialCounts={counts}
        userId={user.id}
        filters={filters}
      />
    </main>
  );
}
