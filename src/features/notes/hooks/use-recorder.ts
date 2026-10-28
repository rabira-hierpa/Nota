"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SILENT_PEAK } from "@/features/notes/lib/audio-level";
import { microphoneErrorMessage, silentRecordingMessage } from "@/features/notes/lib/microphone-error";
import { audioConstraints } from "@/features/notes/lib/microphones";
import { toMonoWav } from "@/features/notes/lib/to-mono-wav";
import type { Microphone } from "@/features/notes/types/microphone";
import { MAX_DURATION_MS } from "@shared/schemas/note";
import type { CreateVoiceNoteInput, Note } from "@shared/types/note";
import type { Result } from "@shared/types/result";

export type RecorderState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "recording"; startedAt: number }
  | { kind: "saving" }
  | { kind: "error"; message: string };

interface Capture {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  microphoneLabel: string | null;
}

const RECORDER_MIME_TYPE = "audio/webm;codecs=opus";
const CHUNK_INTERVAL_MS = 1000;
const MIN_DURATION_MS = 300;
/** Stop a little before the cap so the decoded length never exceeds it. */
const AUTO_STOP_MS = MAX_DURATION_MS - 2000;

function releaseMicrophone(capture: Capture): void {
  capture.stream.getTracks().forEach((track) => track.stop());
}

/**
 * Microphone capture from the chosen device: MediaRecorder while recording,
 * then conversion to WAV and hand-off to `onRecorded` (which saves and starts
 * transcription). A recording with no sound is refused instead of saved.
 */
export function useRecorder(
  microphone: Microphone | null,
  onRecorded: (audio: CreateVoiceNoteInput) => Promise<Result<Note>>,
) {
  const [state, setState] = useState<RecorderState>({ kind: "idle" });
  const captureRef = useRef<Capture | null>(null);
  const microphoneRef = useRef(microphone);
  const onRecordedRef = useRef(onRecorded);

  useEffect(() => {
    microphoneRef.current = microphone;
    onRecordedRef.current = onRecorded;
  }, [microphone, onRecorded]);

  const finish = useCallback(async (capture: Capture) => {
    releaseMicrophone(capture);
    captureRef.current = null;
    setState({ kind: "saving" });
    try {
      const { input, peak } = await toMonoWav(new Blob(capture.chunks, { type: capture.recorder.mimeType }));
      if (input.durationMs < MIN_DURATION_MS) {
        setState({ kind: "error", message: "That recording was too short. Try again." });
        return;
      }
      if (peak < SILENT_PEAK) {
        setState({ kind: "error", message: silentRecordingMessage(capture.microphoneLabel) });
        return;
      }
      const saved = await onRecordedRef.current(input);
      setState(saved.success ? { kind: "idle" } : { kind: "error", message: saved.error });
    } catch {
      setState({ kind: "error", message: "Couldn't process the recording. Try again." });
    }
  }, []);

  const start = useCallback(async () => {
    if (captureRef.current) return;
    setState({ kind: "starting" });
    const chosen = microphoneRef.current;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(chosen) });
    } catch (error) {
      setState({ kind: "error", message: microphoneErrorMessage(error instanceof DOMException ? error.name : "") });
      return;
    }

    const options = MediaRecorder.isTypeSupported(RECORDER_MIME_TYPE) ? { mimeType: RECORDER_MIME_TYPE } : undefined;
    const capture: Capture = {
      recorder: new MediaRecorder(stream, options),
      stream,
      chunks: [],
      microphoneLabel: chosen?.label ?? stream.getAudioTracks()[0]?.label ?? null,
    };
    capture.recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) capture.chunks.push(event.data);
    });
    capture.recorder.addEventListener("stop", () => void finish(capture), { once: true });
    captureRef.current = capture;
    capture.recorder.start(CHUNK_INTERVAL_MS);
    setState({ kind: "recording", startedAt: Date.now() });
  }, [finish]);

  const stop = useCallback(() => {
    const recorder = captureRef.current?.recorder;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  useEffect(() => {
    if (state.kind !== "recording") return;
    const timer = setTimeout(stop, AUTO_STOP_MS);
    return () => clearTimeout(timer);
  }, [state.kind, stop]);

  // Never leave the microphone on if the component goes away mid-recording.
  useEffect(() => {
    const captures = captureRef;
    return () => {
      if (captures.current) releaseMicrophone(captures.current);
    };
  }, []);

  return { state, start, stop };
}
