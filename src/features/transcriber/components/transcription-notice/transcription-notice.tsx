"use client";

import { AlertCircle, XClose } from "@untitledui/icons";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";
import type { Recording } from "@shared/types/recording";

interface TranscriptionNoticeProps {
  recording: Recording;
  transcribing: boolean;
}

/** Why the last transcription or action failed, with what to do about it. */
export function TranscriptionNotice({ recording, transcribing }: TranscriptionNoticeProps) {
  const actionError = useRecordingsStore((state) => state.actionError);
  const dismissError = useRecordingsStore((state) => state.dismissError);
  const engineError =
    !transcribing && recording.transcription.status === "error" ? recording.transcription.message : null;
  const message = actionError ?? engineError;
  if (!message) return null;

  return (
    <div
      role="alert"
      className="mx-8 mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] leading-5 text-amber-950"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
      <p className="flex-1">{message}</p>
      {actionError ? (
        <button
          type="button"
          onClick={dismissError}
          aria-label="Dismiss"
          className="rounded p-0.5 text-amber-700 hover:bg-amber-100"
        >
          <XClose className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
