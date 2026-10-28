"use client";

import { Microphone01 } from "@untitledui/icons";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";

/** Right pane when nothing is selected: first-run guidance, or a load failure. */
export function EmptyTranscript() {
  const load = useRecordingsStore((state) => state.load);
  const loadRecordings = useRecordingsStore((state) => state.loadRecordings);

  if (load.kind === "error") {
    return (
      <div className="m-auto max-w-sm px-8 text-center">
        <h2 className="text-base font-semibold">Couldn&apos;t load your recordings</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{load.message}</p>
        <button
          type="button"
          onClick={() => void loadRecordings()}
          className="mt-5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Try again
        </button>
      </div>
    );
  }
  if (load.kind !== "ready") return null;

  return (
    <div className="m-auto max-w-sm px-8 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-700">
        <Microphone01 className="size-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold">Speak, then read it back in Amharic</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Press <span className="font-medium text-ink">New recording</span>, speak in Amharic, then press Stop. The
        text appears here, ready to edit. Or press <span className="font-medium text-ink">Dictate</span> to watch
        it appear as you speak.
      </p>
    </div>
  );
}
