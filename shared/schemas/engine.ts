import { z } from "zod";

/**
 * The speech models the app can transcribe with. `hohe` and `buzzasr` run
 * locally through the Python helper; `voicestudio` is VoiceStudio's own
 * engine, offered only when STT_ENGINE=voicestudio.
 */
export const modelIdSchema = z.enum(["hohe", "buzzasr", "voicestudio"]);

/** The models Nota can set up and run on this machine. */
export const localModelIdSchema = z.enum(["hohe", "buzzasr"]);

/** Progress from setting up a model (scripts/setup-amharic-model.sh, run by the app). */
export const setupEventSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("line"), text: z.string().max(500) }),
  z.object({ kind: z.literal("done"), ok: z.boolean() }),
]);
