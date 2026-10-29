import { z } from "zod";
import type { Messages } from "@/lib/i18n";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@shared/schemas/note";

/** The new password, typed twice, with the warning ticked. Messages in the interface's language. */
export function setPasswordFormSchema(words: Messages["setPassword"]) {
  return z
    .object({
      password: z.string().min(MIN_PASSWORD_LENGTH, words.minLength(MIN_PASSWORD_LENGTH)).max(MAX_PASSWORD_LENGTH),
      confirm: z.string(),
      understood: z.literal(true, { error: words.tick }),
    })
    .refine((form) => form.password === form.confirm, { path: ["confirm"], message: words.mismatch });
}

export type SetPasswordForm = z.input<ReturnType<typeof setPasswordFormSchema>>;
