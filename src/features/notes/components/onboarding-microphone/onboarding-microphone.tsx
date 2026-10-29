import { MicrophoneSelect } from "@/features/notes/components/microphone-select";

/** Choosing the microphone, and the two ways to speak a note. */
export function OnboardingMicrophone() {
  return (
    <div className="space-y-3 text-[13px] leading-5">
      <p>Pick the microphone you speak into. Nota asks for permission the first time you record or dictate.</p>
      <MicrophoneSelect disabled={false} />
      <ul className="space-y-1 text-muted">
        <li>
          <strong className="text-ink">Record</strong> (microphone above the note list, ⌘⇧R): a voice note, transcribed
          after you stop.
        </li>
        <li>
          <strong className="text-ink">Dictate</strong> (in a note, ⌘⇧D): the words appear at the cursor after each pause.
        </li>
      </ul>
    </div>
  );
}
