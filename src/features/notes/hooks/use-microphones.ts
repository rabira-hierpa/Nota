"use client";

import { useEffect } from "react";
import { useMicrophoneStore } from "@/features/notes/stores/microphone-store";
import type { Microphone } from "@/features/notes/types/microphone";

/** Keeps the microphone list current as devices are plugged in or removed. */
export function useMicrophoneList(): void {
  const refresh = useMicrophoneStore((state) => state.refresh);

  useEffect(() => {
    void refresh();
    const media = navigator.mediaDevices;
    if (!media) return;
    const onChange = () => void refresh();
    media.addEventListener("devicechange", onChange);
    return () => media.removeEventListener("devicechange", onChange);
  }, [refresh]);
}

export function useSelectedMicrophone(): Microphone | null {
  return useMicrophoneStore(
    (state) => state.microphones.find((microphone) => microphone.id === state.selectedId) ?? null,
  );
}
