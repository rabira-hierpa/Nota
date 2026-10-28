import { z } from "zod";
import { MAX_PASSWORD_LENGTH } from "@shared/schemas/note";

/** Any non-empty password may be tried; the main process says whether it is right. */
export const unlockFormSchema = z.object({
  password: z.string().min(1, "Enter your password.").max(MAX_PASSWORD_LENGTH),
});

export type UnlockForm = z.infer<typeof unlockFormSchema>;
