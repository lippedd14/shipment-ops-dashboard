import { z } from "zod";

import { Constants, type Database } from "@/lib/database.types";

export type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];
export type Shipment = Database["public"]["Tables"]["shipments"]["Row"];

/** Derived from the generated types, so a new enum value cannot be forgotten here. */
export const SHIPMENT_STATUSES = Constants.public.Enums.shipment_status;

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: "Pendente",
  in_transit: "Em trânsito",
  delivered: "Entregue",
  delayed: "Atrasada",
};

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
  status: z.enum(SHIPMENT_STATUSES, {
    message: "Selecione um status válido.",
  }),
});

export type ShipmentInput = z.infer<typeof shipmentSchema>;

export type ShipmentFieldErrors = Partial<Record<keyof ShipmentInput, string>>;

const FIELDS = [
  "tracking_code",
  "origin",
  "destination",
  "carrier",
  "status",
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
    if (field !== undefined && isField(field) && fieldErrors[field] === undefined) {
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
  });
}
