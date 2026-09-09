"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold">Algo deu errado</h1>
      <p
        role="alert"
        className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
      >
        {error.message}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Tentar de novo
        </button>
        <Link
          href="/dashboard"
          className="text-sm text-black/60 underline underline-offset-4 dark:text-white/60"
        >
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}
