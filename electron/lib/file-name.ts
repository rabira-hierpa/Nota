const MAX_NAME_LENGTH = 120;
const FALLBACK_NAME = "Note";
/** Characters no file system accepts (or that would make a path), and control characters. */
const UNSAFE = /[/\\:*?"<>|\u0000-\u001f\u007f]+/g;

/** A note title made safe as a file name: "ስብሰባ: 3/10" → "ስብሰባ 3 10". */
export function safeFileName(title: string): string {
  const cleaned = title.replace(UNSAFE, " ").replace(/\s+/g, " ").replace(/^[.\s]+/, "").trim();
  return cleaned.slice(0, MAX_NAME_LENGTH).trim() || FALLBACK_NAME;
}
