"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  collectFieldErrors,
  credentialsSchema,
  type FieldErrors,
} from "@/lib/validation/auth";

export type AuthState = {
  /** Message returned by Supabase, shown verbatim. */
  formError?: string;
  fieldErrors?: FieldErrors;
  /** Set when sign-up succeeded but the address still needs confirming. */
  notice?: string;
};

function parse(formData: FormData) {
  return credentialsSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
}

export async function signIn(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { fieldErrors: collectFieldErrors(parsed.error) };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { formError: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { fieldErrors: collectFieldErrors(parsed.error) };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    return { formError: error.message };
  }

  // With email confirmation enabled, no session is returned and the user must
  // confirm before signing in.
  if (!data.session) {
    return {
      notice:
        "Conta criada. Confirme o e-mail pelo link enviado para concluir o acesso.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
