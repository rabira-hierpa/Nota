"use client";

import { useId } from "react";
import { PauseCircle, PlayCircle, RefreshCw01 } from "@untitledui/icons";
import { ModelSelect } from "@/features/notes/components/model-select";
import { TranscriptionBadge } from "@/features/notes/components/transcription-badge";
import { useAudioPlayer } from "@/features/notes/hooks/use-audio-player";
import { formatDuration } from "@/features/notes/lib/format";
import { MODEL_NAMES } from "@/features/notes/lib/model-labels";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useMessages } from "@/hooks/use-messages";
import { cx } from "@/utils/cx";
import type { Note, NoteAudio } from "@shared/types/note";

const MS_PER_SECOND = 1000;
const SEEK_STEP_SECONDS = 0.1;

interface AudioBarProps {
  note: Note & { audio: NoteAudio };
  transcribing: boolean;
  /** Dictation is writing into this note, or it is in the Trash. */
  locked: boolean;
}

/** Bottom bar of a spoken note: play it back, see how it was transcribed, transcribe it again. */
export function AudioBar({ note, transcribing, locked }: AudioBarProps) {
  const source = useNotesStore((state) => (state.audio?.noteId === note.id ? state.audio.url : undefined));
  const transcribe = useNotesStore((state) => state.transcribe);
  const { audioRef, playing, currentTime, duration, toggle, seek } = useAudioPlayer(
    source,
    note.audio.durationMs / MS_PER_SECOND,
  );
  const seekId = useId();
  const { transcription } = note.audio;
  const model = transcription.status === "done" ? transcription.model : undefined;
  const m = useMessages();

  const retranscribe = () => {
    const replacing = note.text.trim().length > 0;
    if (replacing && !window.confirm(m.audio.confirmReplace)) return;
    void transcribe(note.id);
  };

  return (
    <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-sidebar px-5 py-2">
      <audio ref={audioRef} src={source} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        disabled={!source}
        aria-label={playing ? m.audio.pause : m.audio.play}
        className="shrink-0 cursor-pointer rounded-full text-accent transition-opacity duration-150 hover:opacity-80 disabled:cursor-default disabled:text-faint"
      >
        {playing ? <PauseCircle className="size-8" aria-hidden /> : <PlayCircle className="size-8" aria-hidden />}
      </button>
      <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-muted">
        {formatDuration(currentTime * MS_PER_SECOND)}
      </span>
      <label htmlFor={seekId} className="sr-only">
        {m.audio.position}
      </label>
      <input
        id={seekId}
        type="range"
        min={0}
        max={duration}
        step={SEEK_STEP_SECONDS}
        value={Math.min(currentTime, duration)}
        onChange={(event) => seek(Number(event.target.value))}
        disabled={!source}
        className="h-1 min-w-24 flex-1 cursor-pointer accent-accent disabled:cursor-default"
      />
      <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-muted">
        {formatDuration(duration * MS_PER_SECOND)}
      </span>
      <span className="mx-1 h-5 w-px bg-line" aria-hidden />
      <TranscriptionBadge status={transcription.status} transcribing={transcribing} />
      {model && !transcribing ? <span className="text-xs text-muted">{m.audio.by(MODEL_NAMES[model])}</span> : null}
      <ModelSelect disabled={transcribing || locked} compact />
      <button
        type="button"
        onClick={retranscribe}
        disabled={transcribing || locked}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw01 className={cx("size-3.5", transcribing && "animate-spin")} aria-hidden />
        {transcription.status === "pending" ? m.audio.transcribe : m.audio.transcribeAgain}
      </button>
    </footer>
  );
}
