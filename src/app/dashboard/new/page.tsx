import type { Metadata } from "next";
import Link from "next/link";

import { createShipment } from "@/app/dashboard/actions";
import { ShipmentForm } from "@/components/shipment-form";

export const metadata: Metadata = {
  title: "Nova remessa",
};

export default function NewShipmentPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <Link
          href="/dashboard"
          className="text-sm text-black/60 underline underline-offset-4 dark:text-white/60"
        >
          ← Voltar
        </Link>
        <h1 className="text-2xl font-semibold">Nova remessa</h1>
      </div>

      <ShipmentForm
        action={createShipment}
        submitLabel="Criar remessa"
        pendingLabel="Criando..."
      />
    </main>
  );
}
