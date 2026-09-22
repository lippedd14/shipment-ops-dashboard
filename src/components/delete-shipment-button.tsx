"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { deleteShipment, type RowActionState } from "@/app/dashboard/actions";
import { BTN_DANGER, BTN_SMALL } from "@/components/ui";

const initialState: RowActionState = {};

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={BTN_DANGER}>
      {pending ? "Excluindo…" : "Excluir"}
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
          className={BTN_SMALL}
        >
          Excluir
        </button>
        {state.error ? (
          <p role="alert" className="text-meta text-delayed">
            {state.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <p className="text-meta text-muted">
        Excluir <span className="font-medium text-ink">{trackingCode}</span>?
      </p>
      <div className="flex gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={() => setConfirming(false)}
          className={BTN_SMALL}
        >
          Manter
        </button>
        <ConfirmButton />
      </div>
      {state.error ? (
        <p role="alert" className="text-meta text-delayed">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
