import type { ComponentType } from "react";
import { cx } from "@/utils/cx";

interface SectionLinkProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  count: number;
  active: boolean;
  onSelect: () => void;
  /** Ge'ez tags read better in the Ethiopic face. */
  lang?: string;
}

/** One row of the sidebar: a section or a tag, with how many notes it holds. */
export function SectionLink({ icon: Icon, label, count, active, onSelect, lang }: SectionLinkProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex h-8 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] transition-colors duration-150",
        active ? "bg-selected font-semibold text-ink" : "text-ink/85 hover:bg-hover",
      )}
    >
      <Icon className={cx("size-4 shrink-0", active ? "text-accent" : "text-muted")} />
      <span lang={lang} className={cx("min-w-0 flex-1 truncate", lang && "font-ethiopic")}>
        {label}
      </span>
      {count > 0 ? <span className="shrink-0 text-xs tabular-nums text-muted">{count}</span> : null}
    </button>
  );
}
