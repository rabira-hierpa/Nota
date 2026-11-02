import { readFileSync } from "node:fs";
import path from "node:path";
import type { z } from "zod";

/**
 * Python's answers for the TypeScript ports, written by
 * `scripts/build-speech-models.sh --fixtures` (tests only).
 */
export function readFixture<T extends z.ZodType>(name: string, schema: T): z.infer<T> {
  return schema.parse(JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", name), "utf8")));
}

/** Little-endian bytes from base64, on a buffer of their own (so typed arrays line up). */
export function fromBase64(text: string): ArrayBuffer {
  return Uint8Array.from(Buffer.from(text, "base64")).buffer;
}
