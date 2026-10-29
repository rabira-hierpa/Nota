"use client";

import { useEffect, useState } from "react";
import { Check, Copy01 } from "@untitledui/icons";

const COPIED_MS = 1500;

interface CopyCommandProps {
  command: string;
}

/** A terminal command shown inline, with a button that copies it. */
export function CopyCommand({ command }: CopyCommandProps) {
  // "Copied" is this button's own, momentary feedback.
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <code className="rounded bg-hover px-1 py-0.5 font-mono text-ink">{command}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            .writeText(command)
            .then(() => setCopied(true))
            .catch(() => setCopied(false));
        }}
        aria-label={copied ? "Copied" : "Copy the command"}
        className="inline-flex cursor-pointer items-center text-muted hover:text-ink"
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy01 className="size-3.5" aria-hidden />}
      </button>
    </span>
  );
}
