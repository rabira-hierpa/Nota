"use client";

import { useId } from "react";
import { Microphone01 } from "@untitledui/icons";
import { useMicrophoneList } from "@/features/transcriber/hooks/use-microphones";
import { useMicrophoneStore } from "@/features/transcriber/stores/microphone-store";

interface MicrophoneSelectProps {
  disabled: boolean;
}

/** Which input to record from. Virtual devices are listed but never chosen by default. */
export function MicrophoneSelect({ disabled }: MicrophoneSelectProps) {
  useMicrophoneList();
  const microphones = useMicrophoneStore((state) => state.microphones);
  const selectedId = useMicrophoneStore((state) => state.selectedId);
  const select = useMicrophoneStore((state) => state.select);
  const selectId = useId();

  if (microphones.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-1">
      <Microphone01 className="size-3.5 shrink-0 text-muted" aria-hidden />
      <label htmlFor={selectId} className="sr-only">
        Microphone
      </label>
      <select
        id={selectId}
        value={selectedId ?? ""}
        onChange={(event) => select(event.target.value)}
        disabled={disabled}
        className="min-w-0 flex-1 cursor-pointer truncate rounded bg-transparent py-0.5 text-xs text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {microphones.map((microphone) => (
          <option key={microphone.id} value={microphone.id}>
            {microphone.label}
          </option>
        ))}
      </select>
    </div>
  );
}
