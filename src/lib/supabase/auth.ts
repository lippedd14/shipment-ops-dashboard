import {
  isAuthRetryableFetchError,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export type AuthCheck =
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

export const AUTH_UNAVAILABLE_MESSAGE =
  "Não foi possível falar com o servidor de autenticação. Verifique sua conexão e tente de novo.";

/**
 * Resolves the current user, keeping "not signed in" and "could not check"
 * apart.
 *
 * getUser() returns a null user for both, so collapsing them signs people out
 * on a network blip even though their session cookie is still valid.
 */
export async function checkUser(
  supabase: SupabaseClient<Database>,
): Promise<AuthCheck> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return isAuthRetryableFetchError(error)
      ? { status: "unavailable" }
      : { status: "unauthenticated" };
  }

  return data.user
    ? { status: "authenticated", user: data.user }
    : { status: "unauthenticated" };
}
