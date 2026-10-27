"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { microphoneErrorMessage } from "@/features/transcriber/lib/microphone-error";
import { toMonoWav } from "@/features/transcriber/lib/to-mono-wav";
import { MAX_DURATION_MS } from "@shared/schemas/recording";
import type { CreateRecordingInput, Recording } from "@shared/types/recording";
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
 * Microphone capture: MediaRecorder while recording, then conversion to WAV
 * and hand-off to `onRecorded` (which saves and starts transcription).
 */
export function useRecorder(onRecorded: (audio: CreateRecordingInput) => Promise<Result<Recording>>) {
  const [state, setState] = useState<RecorderState>({ kind: "idle" });
  const captureRef = useRef<Capture | null>(null);
  const onRecordedRef = useRef(onRecorded);

  useEffect(() => {
    onRecordedRef.current = onRecorded;
  }, [onRecorded]);

  const finish = useCallback(async (capture: Capture) => {
    releaseMicrophone(capture);
    captureRef.current = null;
    setState({ kind: "saving" });
    try {
      const recorded = await toMonoWav(new Blob(capture.chunks, { type: capture.recorder.mimeType }));
      if (recorded.durationMs < MIN_DURATION_MS) {
        setState({ kind: "error", message: "That recording was too short. Try again." });
        return;
      }
      const saved = await onRecordedRef.current(recorded);
      setState(saved.success ? { kind: "idle" } : { kind: "error", message: saved.error });
    } catch {
      setState({ kind: "error", message: "Couldn't process the recording. Try again." });
    }
  }, []);

  const start = useCallback(async () => {
    if (captureRef.current) return;
    setState({ kind: "starting" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch (error) {
      setState({ kind: "error", message: microphoneErrorMessage(error instanceof DOMException ? error.name : "") });
      return;
    }

    const options = MediaRecorder.isTypeSupported(RECORDER_MIME_TYPE) ? { mimeType: RECORDER_MIME_TYPE } : undefined;
    const capture: Capture = { recorder: new MediaRecorder(stream, options), stream, chunks: [] };
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
