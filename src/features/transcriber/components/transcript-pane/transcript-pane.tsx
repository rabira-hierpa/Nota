"use client";

import { AudioPlayer } from "@/features/transcriber/components/audio-player";
import { EmptyTranscript } from "@/features/transcriber/components/empty-transcript";
import { LiveTranscript } from "@/features/transcriber/components/live-transcript";
import { TranscriptEditor } from "@/features/transcriber/components/transcript-editor";
import { TranscriptHeader } from "@/features/transcriber/components/transcript-header";
import { TranscriptionNotice } from "@/features/transcriber/components/transcription-notice";
import { useSelectedRecording } from "@/features/transcriber/hooks/use-selected-recording";
import { transcriptionRevision } from "@/features/transcriber/lib/recording-display";
import { useDictationStore } from "@/features/transcriber/stores/dictation-store";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";

/** Right column: the selected recording's text, editable, with playback below; or live dictation. */
export function TranscriptPane() {
  const recording = useSelectedRecording();
  const transcribing = useRecordingsStore(
    (state) => recording !== null && state.transcribingIds.includes(recording.id),
  );
  const dictating = useDictationStore((state) => state.state.kind === "listening" || state.state.kind === "finishing");

  if (dictating) {
    return (
      <main className="flex min-h-0 flex-col">
        <LiveTranscript />
      </main>
    );
  }

  if (!recording) {
    return (
      <main className="flex min-h-0 flex-col">
        <EmptyTranscript />
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-col">
      <TranscriptHeader recording={recording} transcribing={transcribing} />
      <TranscriptionNotice recording={recording} transcribing={transcribing} />
      <TranscriptEditor
        key={`${recording.id}:${transcriptionRevision(recording)}`}
        recording={recording}
        transcribing={transcribing}
      />
      <AudioPlayer key={recording.id} recording={recording} />
    </main>
  );
}
