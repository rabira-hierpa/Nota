import type { z } from "zod";
import type { localeSchema, setLocaleInputSchema } from "@shared/schemas/locale";

export type Locale = z.infer<typeof localeSchema>;
export type SetLocaleInput = z.infer<typeof setLocaleInputSchema>;
