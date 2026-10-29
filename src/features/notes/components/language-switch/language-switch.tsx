"use client";

import { useMessages } from "@/hooks/use-messages";
import { useLocaleStore } from "@/stores/locale-store";
import { cx } from "@/utils/cx";
import type { Locale } from "@shared/types/locale";

/** Each language named in itself, so it can be found whichever one is showing. */
const OPTIONS: { value: Locale; label: string; lang: string }[] = [
  { value: "en", label: "English", lang: "en" },
  { value: "am", label: "አማርኛ", lang: "am" },
];

/** The interface's language: English or Amharic. Notes stay in whatever language they're written in. */
export function LanguageSwitch() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const m = useMessages();
  // Named in both languages, for someone who can't read the one on screen.
  const other = locale === "am" ? "Language" : "ቋንቋ";

  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium text-muted">
        {m.settings.language} · <span lang={locale === "am" ? "en" : "am"}>{other}</span>
      </legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-hover p-1">
        {OPTIONS.map(({ value, label, lang }) => (
          <label
            key={value}
            lang={lang}
            className={cx(
              "flex h-8 cursor-pointer items-center justify-center rounded-md text-xs font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
              locale === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <input
              type="radio"
              name="language"
              value={value}
              checked={locale === value}
              onChange={() => setLocale(value)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
