import type { Metadata } from "next";
import { RecordingsSidebar } from "@/features/transcriber/components/recordings-sidebar";
import { TranscriptPane } from "@/features/transcriber/components/transcript-pane";

export const metadata: Metadata = {
  title: "Amharic Speech to Text",
};

export default function HomePage() {
  return (
    <div className="grid h-full grid-cols-[288px_minmax(0,1fr)]">
      <RecordingsSidebar />
      <TranscriptPane />
    </div>
  );
}
