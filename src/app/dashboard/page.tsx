import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { ShipmentsList } from "@/components/shipments-list";
import { AUTH_UNAVAILABLE_MESSAGE, checkUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { Shipment } from "@/lib/validation/shipment";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
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

  // The initial read stays on the server; the client only applies realtime
  // events on top of what arrives as a prop.
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

      <ShipmentsList initialShipments={shipments} userId={user.id} />
    </main>
  );
}
