import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().min(1, "Informe o e-mail.").email("E-mail inválido."),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export type Credentials = z.infer<typeof credentialsSchema>;

/** Per-field messages keyed by field name, for rendering next to each input. */
export type FieldErrors = Partial<Record<keyof Credentials, string>>;

export function collectFieldErrors(error: z.ZodError<Credentials>): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      (field === "email" || field === "password") &&
      fieldErrors[field] === undefined
    ) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}
