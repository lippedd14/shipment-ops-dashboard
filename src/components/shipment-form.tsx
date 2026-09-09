"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import type { ShipmentFormState } from "@/app/dashboard/actions";
import {
  SHIPMENT_STATUSES,
  STATUS_LABELS,
  type ShipmentInput,
} from "@/lib/validation/shipment";

type ShipmentAction = (
  state: ShipmentFormState,
  formData: FormData,
) => Promise<ShipmentFormState>;

type ShipmentFormProps = {
  action: ShipmentAction;
  submitLabel: string;
  pendingLabel: string;
  defaultValues?: Partial<ShipmentInput>;
};

const initialState: ShipmentFormState = {};

const TEXT_FIELDS = [
  { name: "tracking_code", label: "Código de rastreio" },
  { name: "origin", label: "Origem" },
  { name: "destination", label: "Destino" },
  { name: "carrier", label: "Transportadora" },
] as const satisfies readonly { name: keyof ShipmentInput; label: string }[];

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50";

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ShipmentForm({
  action,
  submitLabel,
  pendingLabel,
  defaultValues,
}: ShipmentFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {TEXT_FIELDS.map(({ name, label }) => {
        const error = state.fieldErrors?.[name];
        return (
          <div key={name} className="flex flex-col gap-1.5">
            <label htmlFor={name} className="text-sm font-medium">
              {label}
            </label>
            <input
              id={name}
              name={name}
              type="text"
              defaultValue={defaultValues?.[name] ?? ""}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${name}-error` : undefined}
              className={inputClass}
            />
            {error ? (
              <p
                id={`${name}-error`}
                className="text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </p>
            ) : null}
          </div>
        );
      })}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status ?? "pending"}
          aria-invalid={state.fieldErrors?.status ? true : undefined}
          aria-describedby={
            state.fieldErrors?.status ? "status-error" : undefined
          }
          className={inputClass}
        >
          {SHIPMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        {state.fieldErrors?.status ? (
          <p id="status-error" className="text-sm text-red-600 dark:text-red-400">
            {state.fieldErrors.status}
          </p>
        ) : null}
      </div>

      {state.formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {state.formError}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
        <Link
          href="/dashboard"
          className="text-sm text-black/60 underline underline-offset-4 dark:text-white/60"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
