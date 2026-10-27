import { EngineStatus } from "@/features/transcriber/components/engine-status";
import { RecordButton } from "@/features/transcriber/components/record-button";
import { RecordingList } from "@/features/transcriber/components/recording-list";

/** Left column: app name, the record control, saved recordings, engine status. */
export function RecordingsSidebar() {
  return (
    <aside className="flex min-h-0 flex-col border-r border-line bg-panel">
      <div className="space-y-4 px-4 pb-4 pt-5">
        <div className="px-1">
          <h1 lang="am" className="font-ethiopic text-lg font-semibold leading-tight">
            ድምፅ ወደ ጽሑፍ
          </h1>
          <p className="text-xs text-muted">Amharic speech to text</p>
        </div>
        <RecordButton />
      </div>
      <RecordingList />
      <EngineStatus />
    </aside>
  );
}
