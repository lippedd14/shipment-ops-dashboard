import Link from "next/link";

import { BTN_PRIMARY } from "@/components/ui";

export default function ShipmentNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-6 py-16">
      <h1 className="text-title font-semibold text-ink">
        Essa remessa não está aqui
      </h1>
      <p className="text-body text-muted">
        Ela pode ter sido excluída, ou pertence a outra conta.
      </p>
      <Link href="/dashboard" className={`${BTN_PRIMARY} self-start`}>
        Ver minhas remessas
      </Link>
    </main>
  );
}
