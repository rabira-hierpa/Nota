"use client";

import { RecordingListItem } from "@/features/transcriber/components/recording-list-item";
import { useLoadRecordings } from "@/features/transcriber/hooks/use-load-recordings";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";

export function RecordingList() {
  useLoadRecordings();
  const recordings = useRecordingsStore((state) => state.recordings);
  const loaded = useRecordingsStore((state) => state.load.kind === "ready");

  return (
    <nav aria-label="Recordings" className="flex min-h-0 flex-1 flex-col">
      <h2 className="px-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Recordings</h2>
      {loaded && recordings.length === 0 ? (
        <p className="px-5 py-2 text-xs text-muted">Nothing recorded yet.</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {recordings.map((recording) => (
            <RecordingListItem key={recording.id} recording={recording} />
          ))}
        </ul>
      )}
    </nav>
  );
}
