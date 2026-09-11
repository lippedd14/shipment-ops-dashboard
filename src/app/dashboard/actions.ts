"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { AUTH_UNAVAILABLE_MESSAGE, checkUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  collectShipmentFieldErrors,
  readShipmentForm,
  type ShipmentFieldErrors,
} from "@/lib/validation/shipment";

export type ShipmentFormState = {
  formError?: string;
  fieldErrors?: ShipmentFieldErrors;
};

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = "23505";

/** Row missing or not visible under RLS. */
const NO_ROWS_RETURNED = "PGRST116";

type PostgrestErrorLike = {
  code: string;
  message: string;
  details: string | null;
};

function duplicateTrackingCode(
  error: PostgrestErrorLike,
): ShipmentFormState | null {
  if (error.code !== UNIQUE_VIOLATION) {
    return null;
  }
  return {
    fieldErrors: {
      tracking_code:
        "Você já tem uma remessa com esse código de rastreio. Use outro código.",
    },
  };
}

/**
 * Owner of the mutation, from the verified session.
 *
 * When the auth server is unreachable the caller gets a retryable message
 * instead of being redirected to /login: the session may well still be valid,
 * and bouncing the user out would lose whatever they had typed.
 */
async function resolveUserId(
  supabase: SupabaseClient<Database>,
): Promise<{ userId: string } | { unavailable: true }> {
  const auth = await checkUser(supabase);

  if (auth.status === "unauthenticated") {
    redirect("/login");
  }
  if (auth.status === "unavailable") {
    return { unavailable: true };
  }
  return { userId: auth.user.id };
}

export async function createShipment(
  _prevState: ShipmentFormState,
  formData: FormData,
): Promise<ShipmentFormState> {
  const parsed = readShipmentForm(formData);
  if (!parsed.success) {
    return { fieldErrors: collectShipmentFieldErrors(parsed.error) };
  }

  const supabase = createClient();
  const owner = await resolveUserId(supabase);
  if ("unavailable" in owner) {
    return { formError: AUTH_UNAVAILABLE_MESSAGE };
  }

  // The owner comes from the verified session, never from the submitted form.
  const { error } = await supabase
    .from("shipments")
    .insert({ ...parsed.data, user_id: owner.userId });

  if (error) {
    return duplicateTrackingCode(error) ?? { formError: error.message };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateShipment(
  id: string,
  _prevState: ShipmentFormState,
  formData: FormData,
): Promise<ShipmentFormState> {
  const parsed = readShipmentForm(formData);
  if (!parsed.success) {
    return { fieldErrors: collectShipmentFieldErrors(parsed.error) };
  }

  const supabase = createClient();
  const owner = await resolveUserId(supabase);
  if ("unavailable" in owner) {
    return { formError: AUTH_UNAVAILABLE_MESSAGE };
  }

  // The user_id filter is redundant with RLS, but makes the intent explicit and
  // lets us tell "not yours" apart from "does not exist" via the empty result.
  const { data, error } = await supabase
    .from("shipments")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", owner.userId)
    .select("id")
    .single();

  if (error) {
    const duplicate = duplicateTrackingCode(error);
    if (duplicate) {
      return duplicate;
    }
    if (error.code === NO_ROWS_RETURNED) {
      return { formError: "Remessa não encontrada." };
    }
    return { formError: error.message };
  }

  if (!data) {
    return { formError: "Remessa não encontrada." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export type DeleteState = { error?: string };

export async function deleteShipment(
  _prevState: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: "Remessa inválida." };
  }

  const supabase = createClient();
  const owner = await resolveUserId(supabase);
  if ("unavailable" in owner) {
    return { error: AUTH_UNAVAILABLE_MESSAGE };
  }

  const { error } = await supabase
    .from("shipments")
    .delete()
    .eq("id", id)
    .eq("user_id", owner.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return {};
}
