"use client";

import Link from "next/link";
// React 18 ships these in react-dom; useActionState is React 19 only.
import { useFormState, useFormStatus } from "react-dom";

import type { AuthState } from "@/app/auth/actions";
import { BTN_PRIMARY, INPUT, LABEL } from "@/components/ui";

type AuthAction = (state: AuthState, formData: FormData) => Promise<AuthState>;

type AuthFormProps = {
  action: AuthAction;
  title: string;
  submitLabel: string;
  pendingLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
  footer: { prompt: string; href: string; linkLabel: string };
};

const initialState: AuthState = {};

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
      className={`${BTN_PRIMARY} w-full py-2`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function AuthForm({
  action,
  title,
  submitLabel,
  pendingLabel,
  passwordAutoComplete,
  footer,
}: AuthFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-title font-semibold text-ink">{title}</h1>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={LABEL}>
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={state.fieldErrors?.email ? true : undefined}
            aria-describedby={
              state.fieldErrors?.email ? "email-error" : undefined
            }
            className={INPUT}
          />
          {state.fieldErrors?.email ? (
            <p id="email-error" className="text-meta text-delayed">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={LABEL}>
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={passwordAutoComplete}
            required
            aria-invalid={state.fieldErrors?.password ? true : undefined}
            aria-describedby={
              state.fieldErrors?.password ? "password-error" : undefined
            }
            className={INPUT}
          />
          {state.fieldErrors?.password ? (
            <p id="password-error" className="text-meta text-delayed">
              {state.fieldErrors.password}
            </p>
          ) : null}
        </div>

        {state.formError ? (
          <p
            role="alert"
            className="rounded-md border border-line bg-surface px-3 py-2 text-body text-delayed"
          >
            {state.formError}
          </p>
        ) : null}

        {state.notice ? (
          <p
            role="status"
            className="rounded-md border border-line bg-surface px-3 py-2 text-body text-ink"
          >
            {state.notice}
          </p>
        ) : null}

        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
      </form>

      <p className="text-body text-muted">
        {footer.prompt}{" "}
        <Link href={footer.href} className="font-medium text-signal hover:underline">
          {footer.linkLabel}
        </Link>
      </p>
    </main>
  );
}
