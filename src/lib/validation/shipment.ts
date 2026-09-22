import { z } from "zod";

import type { Database } from "@/lib/database.types";

export type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];
export type Shipment = Database["public"]["Tables"]["shipments"]["Row"];

/**
 * Stages a shipment moves through, in order.
 *
 * The enum still carries a 'delayed' label because Postgres cannot drop a value
 * from a type in use, but delay is a flag now (is_delayed) and nothing writes
 * that status. `satisfies` keeps this list honest against the generated type.
 */
export const STAGES = [
  "pending",
  "in_transit",
  "delivered",
] as const satisfies readonly ShipmentStatus[];

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  pending: "Pendente",
  in_transit: "Em trânsito",
  delivered: "Entregue",
};

/** Short prompts for the button that advances a card to the next stage. */
export const NEXT_STAGE: Partial<Record<Stage, Stage>> = {
  pending: "in_transit",
  in_transit: "delivered",
};

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

/** The stage a shipment is shown in, tolerating rows written before the flag. */
export function stageOf(shipment: Shipment): Stage {
  return isStage(shipment.status) ? shipment.status : "in_transit";
}

/** Shared by create and edit: the fields a user may set. user_id never appears here. */
export const shipmentSchema = z.object({
  tracking_code: z
    .string()
    .trim()
    .min(1, "Informe o código de rastreio.")
    .max(100, "O código de rastreio é longo demais (máx. 100)."),
  origin: z
    .string()
    .trim()
    .min(1, "Informe a origem.")
    .max(200, "A origem é longa demais (máx. 200)."),
  destination: z
    .string()
    .trim()
    .min(1, "Informe o destino.")
    .max(200, "O destino é longo demais (máx. 200)."),
  carrier: z
    .string()
    .trim()
    .min(1, "Informe a transportadora.")
    .max(200, "A transportadora é longa demais (máx. 200)."),
  status: z.enum(STAGES, { message: "Escolha uma etapa válida." }),
  is_delayed: z.boolean(),
});

export type ShipmentInput = z.infer<typeof shipmentSchema>;

export type ShipmentFieldErrors = Partial<Record<keyof ShipmentInput, string>>;

const FIELDS = [
  "tracking_code",
  "origin",
  "destination",
  "carrier",
  "status",
  "is_delayed",
] as const satisfies readonly (keyof ShipmentInput)[];

function isField(value: PropertyKey): value is keyof ShipmentInput {
  return (FIELDS as readonly PropertyKey[]).includes(value);
}

export function collectShipmentFieldErrors(
  error: z.ZodError<ShipmentInput>,
): ShipmentFieldErrors {
  const fieldErrors: ShipmentFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      field !== undefined &&
      isField(field) &&
      fieldErrors[field] === undefined
    ) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

/** Reads the form fields this schema owns, leaving validation to Zod. */
export function readShipmentForm(formData: FormData) {
  return shipmentSchema.safeParse({
    tracking_code: String(formData.get("tracking_code") ?? ""),
    origin: String(formData.get("origin") ?? ""),
    destination: String(formData.get("destination") ?? ""),
    carrier: String(formData.get("carrier") ?? ""),
    status: String(formData.get("status") ?? ""),
    // An unchecked box sends nothing at all.
    is_delayed: formData.get("is_delayed") !== null,
  });
}
