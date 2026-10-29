"use client";

import { useEffect, useId, useRef } from "react";
import { BookOpen01, Keyboard01, Lock01, Settings01 } from "@untitledui/icons";
import { MicrophoneSelect } from "@/features/notes/components/microphone-select";
import { ModelSelect } from "@/features/notes/components/model-select";
import { ThemeSwitch } from "@/features/notes/components/theme-switch";
import { onCommand } from "@/features/notes/lib/command-bus";
import { useDictationStore } from "@/features/notes/stores/dictation-store";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useOnboardingStore } from "@/features/notes/stores/onboarding-store";
import { useViewStore } from "@/features/notes/stores/view-store";

const ROW_BUTTON =
  "flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-line bg-paper px-3 text-left text-[13px] font-medium text-ink hover:border-accent";

/**
 * Settings that change rarely: appearance, microphone, speech model, locked
 * notes, and the list of keyboard shortcuts. A native popover, so Escape and
 * clicking outside close it. ⌘, opens it.
 */
export function SettingsMenu() {
  const popoverId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const dictating = useDictationStore((state) => state.state.kind !== "idle" && state.state.kind !== "error");
  const lockStatus = useNotesStore((state) => state.lockStatus);
  const lockNotes = useNotesStore((state) => state.lockNotes);
  const openPasswordDialog = useViewStore((state) => state.openPasswordDialog);
  const setShortcutsOpen = useViewStore((state) => state.setShortcutsOpen);
  const showGuide = useOnboardingStore((state) => state.show);

  useEffect(() => onCommand("openSettings", () => popoverRef.current?.showPopover()), []);

  const lockLabel = !lockStatus.hasPassword
    ? "No password yet: set one to lock notes."
    : lockStatus.unlocked
      ? "Locked notes are open until you lock them."
      : "Locked notes are closed.";

  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        aria-label="Settings"
        title="Settings (⌘,)"
        className="no-drag inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
      >
        <Settings01 className="size-4" />
      </button>
      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        aria-label="Settings"
        className="fixed inset-auto bottom-12 left-3 m-0 max-h-[calc(100vh-4rem)] w-72 space-y-4 overflow-y-auto rounded-xl border border-line bg-surface p-4 text-ink shadow-xl"
      >
        <ThemeSwitch />
        <MicrophoneSelect disabled={dictating} />
        <ModelSelect disabled={dictating} />
        <section aria-label="Locked notes">
          <h2 className="mb-1.5 text-xs font-medium text-muted">Locked notes</h2>
          <p className="mb-2 text-xs leading-5 text-muted">{lockLabel}</p>
          {lockStatus.hasPassword ? (
            <button
              type="button"
              disabled={!lockStatus.unlocked}
              onClick={() => {
                popoverRef.current?.hidePopover();
                void lockNotes();
              }}
              className={`${ROW_BUTTON} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Lock01 className="size-4 text-muted" aria-hidden />
              Lock all notes now
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                popoverRef.current?.hidePopover();
                openPasswordDialog(null);
              }}
              className={ROW_BUTTON}
            >
              <Lock01 className="size-4 text-muted" aria-hidden />
              Set a password
            </button>
          )}
        </section>
        <button
          type="button"
          onClick={() => {
            popoverRef.current?.hidePopover();
            setShortcutsOpen(true);
          }}
          className={ROW_BUTTON}
        >
          <Keyboard01 className="size-4 text-muted" aria-hidden />
          <span className="flex-1">Keyboard shortcuts</span>
          <kbd className="font-sans text-xs text-muted">⌘/</kbd>
        </button>
        <button
          type="button"
          onClick={() => {
            popoverRef.current?.hidePopover();
            showGuide();
          }}
          className={ROW_BUTTON}
        >
          <BookOpen01 className="size-4 text-muted" aria-hidden />
          Setup guide (offline speech)
        </button>
      </div>
    </>
  );
}
