"use client";

import Link from "next/link";
// React 18 ships these in react-dom; useActionState is React 19 only.
import { useFormState, useFormStatus } from "react-dom";

import type { AuthState } from "@/app/auth/actions";

type AuthAction = (
  state: AuthState,
  formData: FormData,
) => Promise<AuthState>;

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
      className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
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
      <h1 className="text-2xl font-semibold">{title}</h1>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
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
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
          />
          {state.fieldErrors?.email ? (
            <p id="email-error" className="text-sm text-red-600 dark:text-red-400">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
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
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
          />
          {state.fieldErrors?.password ? (
            <p
              id="password-error"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {state.fieldErrors.password}
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

        {state.notice ? (
          <p
            role="status"
            className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300"
          >
            {state.notice}
          </p>
        ) : null}

        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
      </form>

      <p className="text-sm text-black/60 dark:text-white/60">
        {footer.prompt}{" "}
        <Link href={footer.href} className="underline underline-offset-4">
          {footer.linkLabel}
        </Link>
      </p>
    </main>
  );
}
