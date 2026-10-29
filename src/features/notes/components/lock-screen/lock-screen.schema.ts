import { z } from "zod";
import type { Messages } from "@/lib/i18n";
import { MAX_PASSWORD_LENGTH } from "@shared/schemas/note";

/** Any non-empty password may be tried; the main process says whether it is right. Messages in the interface's language. */
export function unlockFormSchema(words: Messages["lock"]) {
  return z.object({
    password: z.string().min(1, words.enterPassword).max(MAX_PASSWORD_LENGTH),
  });
}

export type UnlockForm = z.infer<ReturnType<typeof unlockFormSchema>>;
