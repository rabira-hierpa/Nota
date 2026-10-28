import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

interface IconButtonProps {
  /** Read by screen readers and shown as the tooltip. */
  label: string;
  onClick: () => void;
  children: ReactNode;
  /** For toggles (bold, favourite): announced as pressed. */
  pressed?: boolean;
  disabled?: boolean;
  tone?: "default" | "danger";
  className?: string;
}

/** A square, icon-only button: 32px, the toolbar and header's building block. */
export function IconButton({ label, onClick, children, pressed, disabled, tone = "default", className }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cx(
        "no-drag inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-40",
        pressed ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-hover hover:text-ink",
        tone === "danger" && !pressed && "hover:text-accent-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
