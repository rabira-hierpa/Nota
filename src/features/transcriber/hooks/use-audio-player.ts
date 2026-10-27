"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PlaybackState {
  playing: boolean;
  /** Seconds. */
  currentTime: number;
  /** Seconds; 0 until the metadata loads. */
  duration: number;
}

const MEDIA_EVENTS = ["play", "pause", "ended", "timeupdate", "seeked", "loadedmetadata", "durationchange", "emptied"] as const;

/**
 * Mirrors an <audio> element's playback into React state. `fallbackDuration`
 * (seconds) fills the gap before the element has read the file's header.
 */
export function useAudioPlayer(source: string | undefined, fallbackDuration: number) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playback, setPlayback] = useState<PlaybackState>({ playing: false, currentTime: 0, duration: 0 });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const sync = () =>
      setPlayback({
        playing: !audio.paused,
        currentTime: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    MEDIA_EVENTS.forEach((name) => audio.addEventListener(name, sync));
    return () => MEDIA_EVENTS.forEach((name) => audio.removeEventListener(name, sync));
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !source) return;
    if (audio.paused) {
      audio.play().catch(() => setPlayback((state) => ({ ...state, playing: false })));
    } else {
      audio.pause();
    }
  }, [source]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = seconds;
  }, []);

  return {
    audioRef,
    playing: playback.playing,
    currentTime: playback.currentTime,
    duration: playback.duration || fallbackDuration,
    toggle,
    seek,
  };
}
