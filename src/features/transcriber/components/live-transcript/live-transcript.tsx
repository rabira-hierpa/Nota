"use client";

import { AlertCircle } from "@untitledui/icons";
import { MODEL_LABELS } from "@/features/transcriber/lib/model-labels";
import { useDictationStore } from "@/features/transcriber/stores/dictation-store";

function activityLabel(finishing: boolean, pendingClips: number): string {
  if (finishing) return "Finishing the last words…";
  return pendingClips > 0 ? "Transcribing…" : "Listening…";
}

/** Right pane while dictating: the text so far, growing after each pause. */
export function LiveTranscript() {
  const finishing = useDictationStore((store) => store.state.kind === "finishing");
  const model = useDictationStore((store) => store.model);
  const text = useDictationStore((store) => store.text);
  const pendingClips = useDictationStore((store) => store.pendingClips);
  const clipError = useDictationStore((store) => store.clipError);

  return (
    <>
      <header className="border-b border-line px-8 py-4">
        <h2 className="text-[15px] font-semibold">Dictation</h2>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
          {model ? <span>{MODEL_LABELS[model].name}</span> : null}
          <span aria-hidden>·</span>
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700"
          >
            <span className="size-1.5 animate-record-pulse rounded-full bg-brand-600" aria-hidden />
            {activityLabel(finishing, pendingClips)}
          </span>
        </div>
      </header>
      {clipError ? (
        <div
          role="alert"
          className="mx-8 mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] leading-5 text-amber-950"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <p className="flex-1">
            {clipError} The whole recording is transcribed again when you stop.
          </p>
        </div>
      ) : null}
      <section
        aria-label="Live transcript"
        className="min-h-0 flex-1 overflow-y-auto px-8 py-6 text-[19px] leading-[1.9] text-ink"
      >
        {text ? (
          <p lang="am" className="font-ethiopic">
            {text}
          </p>
        ) : (
          <p className="text-[15px] text-muted">Speak in Amharic. Your words appear here after each pause.</p>
        )}
      </section>
    </>
  );
}
