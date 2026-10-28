const REPLACEMENT_CHARACTER = String.fromCodePoint(0xfffd);

/**
 * Whisper decodes byte-level tokens, so it can emit half of a 3-byte Ge'ez
 * character, which arrives as U+FFFD. Drop those and tidy the spacing.
 */
export function cleanTranscript(text: string): string {
  return text.replaceAll(REPLACEMENT_CHARACTER, "").replace(/\s+/g, " ").trim();
}
