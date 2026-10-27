"use client";

import { AudioPlayer } from "@/features/transcriber/components/audio-player";
import { EmptyTranscript } from "@/features/transcriber/components/empty-transcript";
import { TranscriptEditor } from "@/features/transcriber/components/transcript-editor";
import { TranscriptHeader } from "@/features/transcriber/components/transcript-header";
import { TranscriptionNotice } from "@/features/transcriber/components/transcription-notice";
import { useSelectedRecording } from "@/features/transcriber/hooks/use-selected-recording";
import { transcriptionRevision } from "@/features/transcriber/lib/recording-display";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";

/** Right column: the selected recording's text, editable, with playback below. */
export function TranscriptPane() {
  const recording = useSelectedRecording();
  const transcribing = useRecordingsStore(
    (state) => recording !== null && state.transcribingIds.includes(recording.id),
  );

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
