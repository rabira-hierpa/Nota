"use client";

import { useId } from "react";
import { useMicrophoneList } from "@/features/notes/hooks/use-microphones";
import { useMicrophoneStore } from "@/features/notes/stores/microphone-store";
import { useMessages } from "@/hooks/use-messages";

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
  const m = useMessages();

  return (
    <div>
      <label htmlFor={selectId} className="mb-1.5 block text-xs font-medium text-muted">
        {m.microphone.label}
      </label>
      <select
        id={selectId}
        value={selectedId ?? ""}
        onChange={(event) => select(event.target.value)}
        disabled={disabled || microphones.length === 0}
        className="h-9 w-full cursor-pointer truncate rounded-lg border border-line bg-paper px-2.5 text-[13px] text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {microphones.length === 0 ? <option value="">{m.microphone.none}</option> : null}
        {microphones.map((microphone) => (
          <option key={microphone.id} value={microphone.id}>
            {microphone.label}
          </option>
        ))}
      </select>
    </div>
  );
}
