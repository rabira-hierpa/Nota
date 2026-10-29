import Image from "next/image";
import type { Messages } from "@/lib/i18n";

interface OnboardingWelcomeProps {
  words: Messages["onboarding"]["welcome"];
  /** The Amharic greeting under an English title; an Amharic title says it already. */
  greet: boolean;
}

/** The guide's first page: what Nota is. */
export function OnboardingWelcome({ words, greet }: OnboardingWelcomeProps) {
  return (
    <div className="text-center">
      <Image src="/icon.png" alt="" width={84} height={84} priority className="mx-auto rounded-2xl shadow-md" />
      <h2 className="mt-4 text-xl font-bold">{words.title}</h2>
      {greet ? (
        <p lang="am" className="font-ethiopic text-[15px] text-muted">
          እንኳን ደህና መጡ
        </p>
      ) : null}
      <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-[13px] leading-5">
        {words.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  );
}
