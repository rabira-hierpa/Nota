"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { OnboardingMicrophone } from "@/features/notes/components/onboarding-microphone";
import { OnboardingSpeech } from "@/features/notes/components/onboarding-speech";
import { OnboardingWelcome } from "@/features/notes/components/onboarding-welcome";
import { OnboardingWriting } from "@/features/notes/components/onboarding-writing";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/features/notes/lib/onboarding-buttons";
import { useOnboardingStore } from "@/features/notes/stores/onboarding-store";
import { useMessages } from "@/hooks/use-messages";
import type { Messages } from "@/lib/i18n";
import { useLocaleStore } from "@/stores/locale-store";
import { cx } from "@/utils/cx";
import type { Locale } from "@shared/types/locale";

const STEPS = ["welcome", "speech", "microphone", "writing"] as const;

type Step = (typeof STEPS)[number];

const STEP_VIEWS: Record<Step, (m: Messages, locale: Locale) => ReactNode> = {
  welcome: (m, locale) => <OnboardingWelcome words={m.onboarding.welcome} greet={locale !== "am"} />,
  speech: () => <OnboardingSpeech />,
  microphone: (m) => <OnboardingMicrophone words={m.onboarding.microphone} />,
  writing: (m) => <OnboardingWriting words={m.onboarding.writing} />,
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
  const current = STEPS[step] ?? STEPS[0];
  const m = useMessages();
  const locale = useLocaleStore((state) => state.locale);
  const name = m.onboarding.steps[current];
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
              {m.onboarding.guide} · {name}
            </h1>
            <ol className="flex gap-1.5" aria-label={m.onboarding.stepsLabel}>
              {STEPS.map((id, index) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`${index + 1}. ${m.onboarding.steps[id]}`}
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
            {STEP_VIEWS[current](m, locale)}
          </div>
          <footer className="flex items-center gap-2 border-t border-line px-6 py-3">
            <button type="button" onClick={() => void finish()} className={`${SECONDARY_BUTTON} mr-auto text-muted`}>
              {last ? m.common.close : m.onboarding.skip}
            </button>
            {step > 0 ? (
              <button type="button" onClick={() => goTo(step - 1)} className={SECONDARY_BUTTON}>
                {m.common.back}
              </button>
            ) : null}
            <button type="button" onClick={() => (last ? void finish() : goTo(step + 1))} className={PRIMARY_BUTTON}>
              {last ? m.onboarding.start : m.common.next}
            </button>
          </footer>
        </div>
      ) : null}
    </dialog>
  );
}
