"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAudioImport } from "@/features/notes/hooks/use-audio-import";
import { useFileDrop } from "@/features/notes/hooks/use-file-drop";
import { useSelectedMicrophone } from "@/features/notes/hooks/use-microphones";
import { useRecorder } from "@/features/notes/hooks/use-recorder";
import { isAudioFile } from "@/features/notes/lib/audio-import";
import { onCommand } from "@/features/notes/lib/command-bus";
import { useDictationStore } from "@/features/notes/stores/dictation-store";
import { useEngineStore } from "@/features/notes/stores/engine-store";
import { useMicrophoneStore } from "@/features/notes/stores/microphone-store";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { currentMessages } from "@/lib/i18n";

/**
 * The two ways a spoken note comes in: recorded here (⌘⇧R, again to stop),
 * or a recording made elsewhere, picked (⌘⇧O) or dropped on the note list.
 * Either way it is saved as a voice note and transcribed.
 */
export function useNoteCapture() {
  const createVoiceNote = useNotesStore((state) => state.createVoiceNote);
  const pickRecording = useNotesStore((state) => state.pickRecording);
  const prepareModel = useEngineStore((state) => state.prepare);
  const dictating = useDictationStore((state) => state.state.kind !== "idle" && state.state.kind !== "error");
  const setRecording = useMicrophoneStore((state) => state.setRecording);
  const recorder = useRecorder(useSelectedMicrophone(), createVoiceNote);
  const recording = recorder.state.kind !== "idle" && recorder.state.kind !== "error";
  const onImported = useCallback(
    (...args: Parameters<typeof createVoiceNote>) => {
      prepareModel();
      return createVoiceNote(...args);
    },
    [createVoiceNote, prepareModel],
  );
  const importer = useAudioImport({ pick: pickRecording, onImported });
  const { importFile, fail } = importer;
  const onDroppedFiles = useCallback(
    (files: File[]) => {
      const audio = files.find(isAudioFile);
      if (audio) void importFile(audio);
      else fail(currentMessages().errors.notAudio);
    },
    [fail, importFile],
  );
  const drop = useFileDrop(onDroppedFiles);

  // Dictation shares the microphone; it waits while a voice note records.
  useEffect(() => setRecording(recording), [recording, setRecording]);

  // The latest values, read when a key comes.
  const latest = useRef({ recorder, dictating, prepareModel, importer });
  useEffect(() => {
    latest.current = { recorder, dictating, prepareModel, importer };
  });
  useEffect(() => {
    const offs = [
      onCommand("recordVoiceNote", () => {
        const current = latest.current;
        if (current.recorder.state.kind === "recording") current.recorder.stop();
        else if (current.recorder.state.kind === "idle" || current.recorder.state.kind === "error") {
          if (current.dictating) return;
          current.prepareModel();
          void current.recorder.start();
        }
      }),
      onCommand("importAudio", () => {
        if (latest.current.importer.state.kind !== "converting") void latest.current.importer.choose();
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  const error = recorder.state.kind === "error" ? recorder.state.message : null;
  return {
    recorder,
    importer,
    dictating,
    prepareModel,
    drop,
    error: error ?? (importer.state.kind === "error" ? importer.state.message : null),
  };
}
