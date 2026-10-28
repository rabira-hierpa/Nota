import { z } from "zod";

/**
 * The speech models the app can transcribe with. `hohe` and `buzzasr` run
 * locally through the Python helper; `voicestudio` is VoiceStudio's own
 * engine, offered only when STT_ENGINE=voicestudio.
 */
export const modelIdSchema = z.enum(["hohe", "buzzasr", "voicestudio"]);
