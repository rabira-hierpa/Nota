"use client";

import { useId } from "react";
import { Settings01 } from "@untitledui/icons";
import { MicrophoneSelect } from "@/features/notes/components/microphone-select";
import { ModelSelect } from "@/features/notes/components/model-select";
import { ThemeSwitch } from "@/features/notes/components/theme-switch";
import { useDictationStore } from "@/features/notes/stores/dictation-store";

/**
 * Settings that change rarely: appearance, which microphone, which speech
 * model. A native popover, so Escape and clicking outside close it.
 */
export function SettingsMenu() {
  const popoverId = useId();
  const dictating = useDictationStore((state) => state.state.kind !== "idle" && state.state.kind !== "error");

  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        aria-label="Settings"
        title="Settings"
        className="no-drag inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
      >
        <Settings01 className="size-4" />
      </button>
      <div
        id={popoverId}
        popover="auto"
        aria-label="Settings"
        className="fixed inset-auto bottom-12 left-3 m-0 w-72 space-y-4 rounded-xl border border-line bg-surface p-4 text-ink shadow-xl"
      >
        <ThemeSwitch />
        <MicrophoneSelect disabled={dictating} />
        <ModelSelect disabled={dictating} />
      </div>
    </>
  );
}
