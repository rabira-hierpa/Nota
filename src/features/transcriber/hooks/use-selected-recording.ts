"use client";

import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";
import type { Recording } from "@shared/types/recording";

export function useSelectedRecording(): Recording | null {
  return useRecordingsStore(
    (state) => state.recordings.find((recording) => recording.id === state.selectedId) ?? null,
  );
}

export function useIsTranscribing(id: string): boolean {
  return useRecordingsStore((state) => state.transcribingIds.includes(id));
}
