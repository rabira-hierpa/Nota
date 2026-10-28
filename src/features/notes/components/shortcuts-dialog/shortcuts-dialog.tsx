"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { XClose } from "@untitledui/icons";
import { formatAccelerator, isMacPlatform } from "@/features/notes/lib/accelerators";
import { useViewStore } from "@/features/notes/stores/view-store";
import { EDITOR_KEYS, KEYMAP } from "@shared/keymap";
import type { KeyGroup } from "@shared/keymap";

const GROUPS: readonly KeyGroup[] = ["Notes", "Note", "Voice", "View"];

/** Every keyboard shortcut, from the same table the menu bar is built from. Opened with ⌘/ or from Settings. */
export function ShortcutsDialog() {
  const open = useViewStore((state) => state.shortcutsOpen);
  const setOpen = useViewStore((state) => state.setShortcutsOpen);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const mac = useMemo(() => isMacPlatform(), []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const sections = [
    ...GROUPS.map((group) => ({
      title: group,
      rows: KEYMAP.filter((binding) => binding.group === group).map((binding) => ({
        label: binding.when ? `${binding.label} (${binding.when})` : binding.label,
        keys: formatAccelerator(binding.accelerator, mac),
      })),
    })),
    {
      title: "Writing",
      rows: EDITOR_KEYS.map((key) => ({ label: key.label, keys: formatAccelerator(key.accelerator, mac) })),
    },
  ];

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => setOpen(false)}
      className="m-auto max-h-[min(40rem,calc(100vh-4rem))] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/30"
    >
      <div className="sticky top-0 flex items-center border-b border-line bg-surface px-5 py-3">
        <h2 id={titleId} className="flex-1 text-[15px] font-bold">
          Keyboard shortcuts
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-hover hover:text-ink"
        >
          <XClose className="size-4" />
        </button>
      </div>
      {/* Drawn only when open: the keys depend on the platform, which the build can't know. */}
      {open ? (
        <div className="grid gap-x-8 gap-y-5 px-5 py-4 sm:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} aria-label={section.title}>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{section.title}</h3>
              <dl className="space-y-1">
                {section.rows.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 text-[13px]">
                    <dt className="text-ink/90">{row.label}</dt>
                    <dd>
                      <kbd className="whitespace-nowrap rounded-md border border-line bg-paper px-1.5 py-0.5 font-sans text-xs text-ink">
                        {row.keys}
                      </kbd>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      ) : null}
    </dialog>
  );
}
