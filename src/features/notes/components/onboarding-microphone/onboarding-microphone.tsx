import { MicrophoneSelect } from "@/features/notes/components/microphone-select";
import type { Messages } from "@/lib/i18n";

interface OnboardingMicrophoneProps {
  words: Messages["onboarding"]["microphone"];
}

/** Choosing the microphone, and the two ways to speak a note. */
export function OnboardingMicrophone({ words }: OnboardingMicrophoneProps) {
  return (
    <div className="space-y-3 text-[13px] leading-5">
      <p>{words.intro}</p>
      <MicrophoneSelect disabled={false} />
      <ul className="space-y-1 text-muted">
        <li>
          <strong className="text-ink">{words.record}</strong>
          {words.recordHint}
        </li>
        <li>
          <strong className="text-ink">{words.dictate}</strong>
          {words.dictateHint}
        </li>
      </ul>
    </div>
  );
}
