"use client";

import { useEffect } from "react";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";

/** Loads the saved recordings from the main process once, on first mount. */
export function useLoadRecordings(): void {
  const loadRecordings = useRecordingsStore((state) => state.loadRecordings);
  const idle = useRecordingsStore((state) => state.load.kind === "idle");

  useEffect(() => {
    if (idle) void loadRecordings();
  }, [idle, loadRecordings]);
}
