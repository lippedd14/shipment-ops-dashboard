"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { deleteShipment, type DeleteState } from "@/app/dashboard/actions";

const initialState: DeleteState = {};

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Excluindo..." : "Confirmar"}
    </button>
  );
}

export function DeleteShipmentButton({
  id,
  trackingCode,
}: {
  id: string;
  trackingCode: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useFormState(deleteShipment, initialState);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Move focus to the safe action when the confirmation appears.
  useEffect(() => {
    if (confirming) {
      cancelRef.current?.focus();
    }
  }, [confirming]);

  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md border border-black/15 px-2 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Excluir
        </button>
        {state.error ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs text-black/70 dark:text-white/70">
        Excluir <span className="font-medium">{trackingCode}</span>?
      </p>
      <div className="flex gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-md border border-black/15 px-2 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Cancelar
        </button>
        <ConfirmButton />
      </div>
      {state.error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
