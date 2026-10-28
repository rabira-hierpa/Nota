"use client";

import { useState } from "react";
import { DictateButton } from "@/features/transcriber/components/dictate-button";
import { MicrophoneSelect } from "@/features/transcriber/components/microphone-select";
import { ModelSelect } from "@/features/transcriber/components/model-select";
import { RecordButton } from "@/features/transcriber/components/record-button";
import { useSelectedMicrophone } from "@/features/transcriber/hooks/use-microphones";
import { useRecorder } from "@/features/transcriber/hooks/use-recorder";
import type { RecorderState } from "@/features/transcriber/hooks/use-recorder";
import { useDictationStore } from "@/features/transcriber/stores/dictation-store";
import type { DictationState } from "@/features/transcriber/stores/dictation-store";
import { selectedModel, useEngineStore } from "@/features/transcriber/stores/engine-store";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";

type Capture = "record" | "dictate";

function isBusy(state: RecorderState | DictationState): boolean {
  return state.kind !== "idle" && state.kind !== "error";
}

function errorOf(state: RecorderState | DictationState): string | null {
  return state.kind === "error" ? state.message : null;
}

/**
 * The two ways to capture speech, which share the microphone: record and
 * transcribe after Stop, or dictate and watch the text appear. Below them,
 * the microphone and the model to use.
 */
export function CaptureControls() {
  const add = useRecordingsStore((state) => state.add);
  const prepareModel = useEngineStore((state) => state.prepare);
  const model = useEngineStore(selectedModel);
  const microphone = useSelectedMicrophone();
  const recorder = useRecorder(microphone, add);
  const dictation = useDictationStore((state) => state.state);
  const startDictation = useDictationStore((state) => state.start);
  const stopDictation = useDictationStore((state) => state.stop);
  // Only the capture used last explains its failure.
  const [lastUsed, setLastUsed] = useState<Capture>("record");

  const recording = isBusy(recorder.state);
  const dictating = isBusy(dictation);
  const error = errorOf(lastUsed === "record" ? recorder.state : dictation);

  return (
    <div className="space-y-2">
      <RecordButton
        state={recorder.state}
        disabled={dictating}
        onStart={() => {
          setLastUsed("record");
          prepareModel();
          void recorder.start();
        }}
        onStop={recorder.stop}
      />
      <DictateButton
        state={dictation}
        disabled={recording}
        onStart={() => {
          setLastUsed("dictate");
          void startDictation(microphone, model);
        }}
        onStop={() => void stopDictation()}
      />
      <MicrophoneSelect disabled={recording || dictating} />
      <ModelSelect disabled={recording || dictating} />
      {error ? (
        <p role="alert" className="px-1 text-xs leading-5 text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
