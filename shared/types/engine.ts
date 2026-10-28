import type { z } from "zod";
import type { modelIdSchema } from "@shared/schemas/engine";

export type ModelId = z.infer<typeof modelIdSchema>;

/** Whether an engine can transcribe right now. */
export type EngineStatus = { kind: "online" } | { kind: "offline"; reason: string };

/** A model the main process offers, and whether it can transcribe right now. */
export type ModelStatus = EngineStatus & { model: ModelId };
