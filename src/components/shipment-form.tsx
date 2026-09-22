"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import type { ShipmentFormState } from "@/app/dashboard/actions";
import { BTN_PRIMARY, INPUT, LABEL } from "@/components/ui";
import {
  STAGES,
  STAGE_LABELS,
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

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={BTN_PRIMARY}>
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
            <label htmlFor={name} className={LABEL}>
              {label}
            </label>
            <input
              id={name}
              name={name}
              type="text"
              defaultValue={defaultValues?.[name] ?? ""}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${name}-error` : undefined}
              className={INPUT}
            />
            {error ? (
              <p id={`${name}-error`} className="text-meta text-delayed">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className={LABEL}>
          Etapa
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status ?? "pending"}
          aria-invalid={state.fieldErrors?.status ? true : undefined}
          aria-describedby={
            state.fieldErrors?.status ? "status-error" : undefined
          }
          className={INPUT}
        >
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
        {state.fieldErrors?.status ? (
          <p id="status-error" className="text-meta text-delayed">
            {state.fieldErrors.status}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-body text-ink">
        <input
          type="checkbox"
          name="is_delayed"
          defaultChecked={defaultValues?.is_delayed ?? false}
          className="size-4 accent-[color:var(--signal)]"
        />
        Marcar como atrasada
      </label>

      {state.formError ? (
        <p
          role="alert"
          className="rounded-md border border-line bg-surface px-3 py-2 text-body text-delayed"
        >
          {state.formError}
        </p>
      ) : null}

      <div className="flex items-center gap-4">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
        <Link href="/dashboard" className="text-body text-muted hover:underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
