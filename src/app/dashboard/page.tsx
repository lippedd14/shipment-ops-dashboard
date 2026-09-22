import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ShipmentsDashboard } from "@/components/shipments-dashboard";
import type { Database } from "@/lib/database.types";
import type { ShipmentCounts } from "@/lib/metrics";
import { AUTH_UNAVAILABLE_MESSAGE, checkUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  buildSearchOrFilter,
  parseFilters,
  parseView,
  STAGE_ALL,
  type SearchParams,
  type ShipmentFilters,
} from "@/lib/validation/filters";
import type { Shipment, Stage } from "@/lib/validation/shipment";

export const metadata: Metadata = {
  title: "Remessas",
};

type Client = SupabaseClient<Database>;

/**
 * Counts under the active filters, so a card never reports a wider set than the
 * board under it. head: true asks Postgres for the number only, with no rows on
 * the wire.
 */
async function countShipments(
  supabase: Client,
  filters: ShipmentFilters,
  extra?: { stage?: Stage; delayed?: boolean },
): Promise<number> {
  let query = supabase
    .from("shipments")
    .select("*", { count: "exact", head: true });

  if (filters.stage !== STAGE_ALL) {
    query = query.eq("status", filters.stage);
  }
  if (filters.delayedOnly) {
    query = query.eq("is_delayed", true);
  }
  if (filters.query !== "") {
    query = query.or(buildSearchOrFilter(filters.query));
  }
  if (extra?.stage !== undefined) {
    query = query.eq("status", extra.stage);
  }
  if (extra?.delayed) {
    query = query.eq("is_delayed", true);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(`Não foi possível calcular os números: ${error.message}`);
  }
  return count ?? 0;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseFilters(searchParams);
  const view = parseView(searchParams);
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

  if (filters.stage !== STAGE_ALL) {
    listQuery = listQuery.eq("status", filters.stage);
  }
  if (filters.delayedOnly) {
    listQuery = listQuery.eq("is_delayed", true);
  }
  if (filters.query !== "") {
    listQuery = listQuery.or(buildSearchOrFilter(filters.query));
  }

  const [listResult, total, inTransit, delivered, delayed] = await Promise.all([
    listQuery,
    countShipments(supabase, filters),
    countShipments(supabase, filters, { stage: "in_transit" }),
    countShipments(supabase, filters, { stage: "delivered" }),
    countShipments(supabase, filters, { delayed: true }),
  ]);

  // Thrown so the nearest error boundary renders, instead of showing an empty
  // board that would read as "you have no shipments".
  if (listResult.error) {
    throw new Error(
      `Não foi possível carregar as remessas: ${listResult.error.message}`,
    );
  }

  const shipments: Shipment[] = listResult.data ?? [];
  const counts: ShipmentCounts = {
    total,
    in_transit: inTransit,
    delivered,
    delayed,
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <ShipmentsDashboard
        initialShipments={shipments}
        initialCounts={counts}
        userId={user.id}
        userEmail={user.email ?? ""}
        filters={filters}
        view={view}
      />
    </main>
  );
}
