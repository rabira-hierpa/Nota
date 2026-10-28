import { CaptureControls } from "@/features/transcriber/components/capture-controls";
import { EngineStatus } from "@/features/transcriber/components/engine-status";
import { RecordingList } from "@/features/transcriber/components/recording-list";

/** Left column: app name, record and dictate controls, saved recordings, engine status. */
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
        <CaptureControls />
      </div>
      <RecordingList />
      <EngineStatus />
    </aside>
  );
}
