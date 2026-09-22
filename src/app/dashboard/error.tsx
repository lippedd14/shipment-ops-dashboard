"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BTN_PRIMARY } from "@/components/ui";

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
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-6 py-16">
      <h1 className="text-title font-semibold text-ink">
        Não foi possível carregar
      </h1>
      <p role="alert" className="text-body text-delayed">
        {error.message}
      </p>

      {retried && !isPending ? (
        <p className="text-body text-muted">
          O servidor ainda não respondeu. Verifique a conexão.
        </p>
      ) : null}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={retry}
          disabled={isPending}
          className={BTN_PRIMARY}
        >
          {isPending ? "Tentando…" : "Tentar de novo"}
        </button>
        <Link
          href="/dashboard"
          className="text-body text-muted hover:underline"
        >
          Voltar às remessas
        </Link>
      </div>
    </main>
  );
}
