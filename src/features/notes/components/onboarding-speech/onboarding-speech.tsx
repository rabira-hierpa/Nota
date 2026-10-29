"use client";

import { useEffect, useRef } from "react";
import { Check } from "@untitledui/icons";
import { CopyCommand } from "@/features/notes/components/copy-command";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/features/notes/lib/onboarding-buttons";
import { useEngineStore } from "@/features/notes/stores/engine-store";
import { useOnboardingStore } from "@/features/notes/stores/onboarding-store";
import type { SetupState } from "@/features/notes/stores/onboarding-store";
import { cx } from "@/utils/cx";

const SETUP_COMMAND = "npm run setup:hohe";

function statusLabel(ready: boolean, setup: SetupState): string {
  if (ready) return "Hohe is ready. Speech works offline.";
  return setup.kind === "running" ? "Setting up Hohe…" : "Hohe isn't set up yet.";
}

/** The one-time speech setup, run here with live progress, or from a terminal. */
export function OnboardingSpeech() {
  const engine = useEngineStore((state) => state.state);
  const setup = useOnboardingStore((state) => state.setup);
  const lines = useOnboardingStore((state) => state.lines);
  const startSetup = useOnboardingStore((state) => state.startSetup);
  const cancelSetup = useOnboardingStore((state) => state.cancelSetup);
  const logRef = useRef<HTMLPreElement>(null);
  const hohe = engine.kind === "ready" ? engine.models.find((status) => status.model === "hohe") : undefined;
  const ready = hohe?.kind === "online";
  const running = setup.kind === "running";

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines]);

  if (engine.kind === "ready" && !hohe) {
    return <p className="text-[13px] leading-5">This copy of Nota is set to use VoiceStudio for speech, so there is nothing to set up here.</p>;
  }

  return (
    <div className="space-y-3 text-[13px] leading-5">
      <p>
        Nota transcribes with <strong>Hohe</strong>, an Amharic speech model that runs on this computer. It needs a
        one-time download (the model is 2.4 GB, its Python runtime about 0.6 GB). After that, no internet is needed.
      </p>
      <p
        role="status"
        className={cx(
          "flex items-center gap-2 rounded-lg px-3 py-2 font-medium",
          ready ? "bg-accent-soft text-accent-ink" : "bg-hover text-ink",
        )}
      >
        {ready ? <Check className="size-4" aria-hidden /> : null}
        {statusLabel(ready, setup)}
      </p>
      {ready ? null : (
        <div className="flex flex-wrap items-center gap-2">
          {running ? (
            <button type="button" onClick={() => void cancelSetup()} className={SECONDARY_BUTTON}>
              Cancel
            </button>
          ) : (
            <button type="button" onClick={() => void startSetup("hohe")} className={PRIMARY_BUTTON}>
              {setup.kind === "failed" ? "Try again" : "Set up Hohe"}
            </button>
          )}
          <span className="text-xs text-muted">Needs Python 3.10 or newer, or uv.</span>
        </div>
      )}
      {setup.kind === "failed" ? (
        <p role="alert" className="text-xs text-record">
          {setup.message}
        </p>
      ) : null}
      {lines.length > 0 ? (
        <pre
          ref={logRef}
          aria-label="Setup progress"
          aria-live="polite"
          className="max-h-36 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-paper p-2.5 font-mono text-[11px] leading-4 text-muted"
        >
          {lines.join("\n")}
        </pre>
      ) : null}
      {ready ? null : (
        <p className="text-xs text-muted">
          Prefer a terminal? From the project folder, run <CopyCommand command={SETUP_COMMAND} />. You can also skip
          this and write notes now; speech can be set up later from Settings.
        </p>
      )}
    </div>
  );
}
