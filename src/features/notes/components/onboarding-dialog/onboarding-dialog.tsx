"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { OnboardingMicrophone } from "@/features/notes/components/onboarding-microphone";
import { OnboardingSpeech } from "@/features/notes/components/onboarding-speech";
import { OnboardingWelcome } from "@/features/notes/components/onboarding-welcome";
import { OnboardingWriting } from "@/features/notes/components/onboarding-writing";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/features/notes/lib/onboarding-buttons";
import { useOnboardingStore } from "@/features/notes/stores/onboarding-store";
import { cx } from "@/utils/cx";

const STEPS = ["Welcome", "Offline speech", "Microphone", "Writing"] as const;

const STEP_VIEWS: Record<(typeof STEPS)[number], () => ReactNode> = {
  Welcome: () => <OnboardingWelcome />,
  "Offline speech": () => <OnboardingSpeech />,
  Microphone: () => <OnboardingMicrophone />,
  Writing: () => <OnboardingWriting />,
};

/**
 * The setup guide: shown on a fresh install, and from Settings any time.
 * Its main job is the one-time speech setup, run right here with live
 * progress (or from a terminal, for those who prefer it).
 */
export function OnboardingDialog() {
  const open = useOnboardingStore((state) => state.open);
  const step = useOnboardingStore((state) => state.step);
  const goTo = useOnboardingStore((state) => state.goTo);
  const finish = useOnboardingStore((state) => state.finish);
  const load = useOnboardingStore((state) => state.load);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const name = STEPS[step] ?? STEPS[0];
  const last = step === STEPS.length - 1;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        if (useOnboardingStore.getState().open) void finish();
      }}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/40"
    >
      {open ? (
        <div className="flex max-h-[min(42rem,calc(100vh-3rem))] flex-col">
          <header className="flex items-center justify-between border-b border-line px-6 py-3">
            <h1 id={titleId} className="text-[13px] font-semibold text-muted">
              Setup guide · {name}
            </h1>
            <ol className="flex gap-1.5" aria-label="Steps">
              {STEPS.map((title, index) => (
                <li key={title}>
                  <button
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`${index + 1}. ${title}`}
                    aria-current={index === step ? "step" : undefined}
                    className={cx(
                      "block size-2.5 cursor-pointer rounded-full transition-colors",
                      index === step ? "bg-accent" : "bg-line hover:bg-faint",
                    )}
                  />
                </li>
              ))}
            </ol>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {step > 0 ? <h2 className="mb-3 text-[17px] font-bold">{name}</h2> : null}
            {STEP_VIEWS[name]()}
          </div>
          <footer className="flex items-center gap-2 border-t border-line px-6 py-3">
            <button type="button" onClick={() => void finish()} className={`${SECONDARY_BUTTON} mr-auto text-muted`}>
              {last ? "Close" : "Skip guide"}
            </button>
            {step > 0 ? (
              <button type="button" onClick={() => goTo(step - 1)} className={SECONDARY_BUTTON}>
                Back
              </button>
            ) : null}
            <button type="button" onClick={() => (last ? void finish() : goTo(step + 1))} className={PRIMARY_BUTTON}>
              {last ? "Start writing" : "Next"}
            </button>
          </footer>
        </div>
      ) : null}
    </dialog>
  );
}
