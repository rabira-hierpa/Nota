import { z } from "zod";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@shared/schemas/note";

export const setPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      .max(MAX_PASSWORD_LENGTH),
    confirm: z.string(),
    understood: z.literal(true, { error: "Tick this to confirm you understand." }),
  })
  .refine((form) => form.password === form.confirm, { path: ["confirm"], message: "The passwords don't match." });

export type SetPasswordForm = z.input<typeof setPasswordFormSchema>;
