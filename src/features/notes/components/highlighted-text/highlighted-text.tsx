import { highlightParts } from "@/features/notes/lib/search";

interface HighlightedTextProps {
  text: string;
  terms: readonly string[];
}

/** Text with the search terms marked, as Bear does in its note list. */
export function HighlightedText({ text, terms }: HighlightedTextProps) {
  return (
    <>
      {highlightParts(text, terms).map((part, index) =>
        // Parts never reorder, so the index is a stable key.
        part.match ? (
          <mark key={index} className="rounded-sm bg-mark px-px text-inherit">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
