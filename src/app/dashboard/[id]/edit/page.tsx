import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateShipment } from "@/app/dashboard/actions";
import { ShipmentForm } from "@/components/shipment-form";
import { AUTH_UNAVAILABLE_MESSAGE, checkUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Editar remessa",
};

export default async function EditShipmentPage({
  params,
}: {
  params: { id: string };
}) {
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

  // maybeSingle keeps "not found" and "not yours" indistinguishable: RLS filters
  // other users' rows out, so both arrive here as null.
  const { data: shipment, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar a remessa: ${error.message}`);
  }

  if (!shipment) {
    notFound();
  }

  // Bind the id on the server so the client never supplies which row to update.
  const action = updateShipment.bind(null, shipment.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <Link
          href="/dashboard"
          className="text-sm text-black/60 underline underline-offset-4 dark:text-white/60"
        >
          ← Voltar
        </Link>
        <h1 className="text-2xl font-semibold">Editar remessa</h1>
      </div>

      <ShipmentForm
        action={action}
        submitLabel="Salvar alterações"
        pendingLabel="Salvando..."
        defaultValues={{
          tracking_code: shipment.tracking_code,
          origin: shipment.origin,
          destination: shipment.destination,
          carrier: shipment.carrier,
          status: shipment.status,
        }}
      />
    </main>
  );
}
