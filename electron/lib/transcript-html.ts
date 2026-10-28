const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function transcriptLines(transcript: string): string[] {
  return transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

/** A transcript as the editor's HTML: one paragraph per line, nothing interpreted as markup. */
export function transcriptToHtml(transcript: string): string {
  return transcriptLines(transcript)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

/** The same transcript as a note's plain text, matching what the editor reports (one line per paragraph). */
export function transcriptToText(transcript: string): string {
  return transcriptLines(transcript).join("\n");
}
