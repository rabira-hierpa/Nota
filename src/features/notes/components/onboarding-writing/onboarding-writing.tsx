/** Markdown typed as you write turns into formatting, as in Bear. */
const MARKDOWN_KEYS: [string, string][] = [
  ["# ", "Heading (## and ### for smaller)"],
  ["- ", "Bulleted list"],
  ["1. ", "Numbered list"],
  ["[ ] ", "Checklist item"],
  ["> ", "Quote"],
  ["```", "Code block"],
  ["**bold**", "Bold"],
  ["*italic*", "Italic"],
  ["~~text~~", "Strikethrough"],
  ["==text==", "Highlight"],
  ["`code`", "Inline code"],
  ["---", "Divider"],
  ["#tag", "Files the note under a tag"],
  ["[[Title]]", "Links to another note"],
];

/** The Markdown shortcuts, and where to find the rest. */
export function OnboardingWriting() {
  return (
    <div className="space-y-3 text-[13px] leading-5">
      <p>Type Markdown and it turns into formatting as you write:</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {MARKDOWN_KEYS.map(([keys, meaning]) => (
          <div key={keys} className="contents">
            <dt>
              <code className="rounded bg-hover px-1.5 py-0.5 font-mono text-xs text-ink">{keys}</code>
            </dt>
            <dd className="text-muted">{meaning}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted">
        ⌘⇧F opens Zen mode for writing or dictating with nothing else on screen. ⌘/ lists every shortcut.
      </p>
    </div>
  );
}
