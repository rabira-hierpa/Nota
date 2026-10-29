"use client";

import { useEffect, useId, useRef } from "react";
import { BookOpen01, Keyboard01, Lock01, Settings01 } from "@untitledui/icons";
import { CalendarSwitch } from "@/features/notes/components/calendar-switch";
import { LanguageSwitch } from "@/features/notes/components/language-switch";
import { MicrophoneSelect } from "@/features/notes/components/microphone-select";
import { ModelSelect } from "@/features/notes/components/model-select";
import { ThemeSwitch } from "@/features/notes/components/theme-switch";
import { useMessages } from "@/hooks/use-messages";
import { onCommand } from "@/features/notes/lib/command-bus";
import { useDictationStore } from "@/features/notes/stores/dictation-store";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useOnboardingStore } from "@/features/notes/stores/onboarding-store";
import { useViewStore } from "@/features/notes/stores/view-store";

const ROW_BUTTON =
  "flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-line bg-paper px-3 py-1.5 text-left text-[13px] font-medium leading-5 text-ink hover:border-accent";

/**
 * Settings that change rarely: language, appearance, dates, microphone, speech model, locked
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
  const setSidebarHidden = useViewStore((state) => state.setSidebarHidden);
  const setZen = useViewStore((state) => state.setZen);
  const showGuide = useOnboardingStore((state) => state.show);

  // The popover opens from the sidebar's foot, so ⌘, brings the sidebar back first (the next frame, once it can take focus).
  useEffect(
    () =>
      onCommand("openSettings", () => {
        const { sidebarHidden, zen } = useViewStore.getState();
        if (!sidebarHidden && !zen) {
          popoverRef.current?.showPopover();
          return;
        }
        setZen(false);
        setSidebarHidden(false);
        requestAnimationFrame(() => popoverRef.current?.showPopover());
      }),
    [setSidebarHidden, setZen],
  );

  const m = useMessages();
  const lockLabel = !lockStatus.hasPassword
    ? m.settings.noPassword
    : lockStatus.unlocked
      ? m.settings.unlocked
      : m.settings.closed;

  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        aria-label={m.settings.button}
        title={m.settings.hint}
        className="no-drag inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
      >
        <Settings01 className="size-4" />
      </button>
      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        aria-label={m.settings.button}
        className="fixed inset-auto bottom-12 left-3 m-0 max-h-[calc(100vh-4rem)] w-72 space-y-4 overflow-y-auto rounded-xl border border-line bg-surface p-4 text-ink shadow-xl"
      >
        <LanguageSwitch />
        <ThemeSwitch />
        <CalendarSwitch />
        <MicrophoneSelect disabled={dictating} />
        <ModelSelect disabled={dictating} />
        <section aria-label={m.settings.lockedNotes}>
          <h2 className="mb-1.5 text-xs font-medium text-muted">{m.settings.lockedNotes}</h2>
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
              {m.settings.lockAll}
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
              {m.settings.setPassword}
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
          <span className="flex-1">{m.settings.shortcuts}</span>
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
          {m.settings.guide}
        </button>
      </div>
    </>
  );
}
