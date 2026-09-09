import Link from "next/link";

export default function ShipmentNotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold">Remessa não encontrada</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        Ela pode ter sido excluída, ou não pertence à sua conta.
      </p>
      <Link
        href="/dashboard"
        className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Voltar ao dashboard
      </Link>
    </main>
  );
}
