"use client";

import { useCallback, useId, useState } from "react";
import { useDebouncedSave } from "@/features/transcriber/hooks/use-debounced-save";
import { editorPlaceholder } from "@/features/transcriber/lib/recording-display";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";
import { MAX_TRANSCRIPT_LENGTH } from "@shared/schemas/recording";
import type { Recording } from "@shared/types/recording";

type SaveState = "idle" | "saving" | "saved" | "failed";

const SAVE_DELAY_MS = 600;
const SAVE_LABELS: Record<SaveState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  failed: "Couldn't save your edit",
};

interface TranscriptEditorProps {
  recording: Recording;
  transcribing: boolean;
}

/**
 * The editable Amharic transcript. Uncontrolled: the parent remounts it (via
 * `key`) when the engine delivers new text, so typing never fights the store.
 */
export function TranscriptEditor({ recording, transcribing }: TranscriptEditorProps) {
  const saveTranscript = useRecordingsStore((state) => state.saveTranscript);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const inputId = useId();

  const save = useCallback(
    (text: string) => {
      setSaveState("saving");
      saveTranscript(recording.id, text)
        .then((result) => setSaveState(result.success ? "saved" : "failed"))
        .catch(() => setSaveState("failed"));
    },
    [recording.id, saveTranscript],
  );
  const { schedule, flush } = useDebouncedSave(save, SAVE_DELAY_MS);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <label htmlFor={inputId} className="sr-only">
        Amharic transcript
      </label>
      <textarea
        id={inputId}
        lang="am"
        defaultValue={recording.transcript}
        readOnly={transcribing}
        maxLength={MAX_TRANSCRIPT_LENGTH}
        placeholder={editorPlaceholder(recording, transcribing)}
        onChange={(event) => schedule(event.target.value)}
        onBlur={flush}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none bg-transparent px-8 py-6 font-ethiopic text-[19px] leading-[1.9] text-ink outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-muted/80 read-only:text-ink/60 focus-visible:outline-none"
      />
      <p aria-live="polite" className="pointer-events-none absolute bottom-2 right-8 text-[11px] text-muted">
        {SAVE_LABELS[saveState]}
      </p>
    </div>
  );
}
