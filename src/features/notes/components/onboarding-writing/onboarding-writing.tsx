import type { Messages } from "@/lib/i18n";

type MarkdownKey = keyof Messages["onboarding"]["writing"]["keys"];

/** Markdown typed as you write turns into formatting, as in Bear: what to type, and what it does. */
const MARKDOWN_KEYS: [string, MarkdownKey][] = [
  ["# ", "heading"],
  ["- ", "bullet"],
  ["1. ", "numbered"],
  ["[ ] ", "check"],
  ["> ", "quote"],
  ["```", "codeBlock"],
  ["**bold**", "bold"],
  ["*italic*", "italic"],
  ["~~text~~", "strike"],
  ["==text==", "highlight"],
  ["`code`", "code"],
  ["---", "divider"],
  ["#tag", "tag"],
  ["[[Title]]", "link"],
];

interface OnboardingWritingProps {
  words: Messages["onboarding"]["writing"];
}

/** The Markdown shortcuts, and where to find the rest. */
export function OnboardingWriting({ words }: OnboardingWritingProps) {
  return (
    <div className="space-y-3 text-[13px] leading-5">
      <p>{words.intro}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {MARKDOWN_KEYS.map(([keys, meaning]) => (
          <div key={keys} className="contents">
            <dt>
              <code className="rounded bg-hover px-1.5 py-0.5 font-mono text-xs text-ink">{keys}</code>
            </dt>
            <dd className="text-muted">{words.keys[meaning]}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted">{words.outro}</p>
    </div>
  );
}
