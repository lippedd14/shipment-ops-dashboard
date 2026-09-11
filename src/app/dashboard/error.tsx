"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [retried, setRetried] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  // reset() only clears the boundary and re-renders the cached segment, which
  // still holds the failed result. router.refresh() is what refetches the
  // Server Components, so the retry needs both.
  const retry = () => {
    setRetried(true);
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold">Algo deu errado</h1>
      <p
        role="alert"
        className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
      >
        {error.message}
      </p>
      {retried && !isPending ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          Ainda sem resposta do servidor. Verifique a conexão e tente de novo.
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={retry}
          disabled={isPending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Tentando..." : "Tentar de novo"}
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
