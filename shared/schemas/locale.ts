import { z } from "zod";

/** The languages Nota's interface is written in. Notes themselves are in whatever language they're typed. */
export const localeSchema = z.enum(["en", "am"]);

export const setLocaleInputSchema = z.object({ locale: localeSchema }).strict();
