import Image from "next/image";

/** The guide's first page: what Nota is. */
export function OnboardingWelcome() {
  return (
    <div className="text-center">
      <Image src="/icon.png" alt="" width={84} height={84} priority className="mx-auto rounded-2xl shadow-md" />
      <h2 className="mt-4 text-xl font-bold">Welcome to Nota</h2>
      <p lang="am" className="font-ethiopic text-[15px] text-muted">
        እንኳን ደህና መጡ
      </p>
      <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-[13px] leading-5">
        <li>Write notes in Amharic or English, with Markdown formatting, tags and links.</li>
        <li>Speak instead of typing: record a voice note, or dictate and watch the words appear.</li>
        <li>Everything stays on this computer. After a one-time setup, speech works offline too.</li>
      </ul>
    </div>
  );
}
