import type { Metadata } from "next";
import { NoteList } from "@/features/notes/components/note-list";
import { NotePane } from "@/features/notes/components/note-pane";
import { NotesSidebar } from "@/features/notes/components/notes-sidebar";
import { OnboardingDialog } from "@/features/notes/components/onboarding-dialog";
import { SetPasswordDialog } from "@/features/notes/components/set-password-dialog";
import { ShortcutsDialog } from "@/features/notes/components/shortcuts-dialog";

export const metadata: Metadata = {
  title: "Nota",
};

/**
 * Bear's three columns: where to look, what's there, and the note itself.
 * The dialogs sit outside them, so they still open with the sidebar folded
 * away or in Zen mode.
 */
export default function HomePage() {
  return (
    <>
      <div className="notes-grid grid h-full">
        <NotesSidebar />
        <NoteList />
        <NotePane />
      </div>
      <SetPasswordDialog />
      <ShortcutsDialog />
      <OnboardingDialog />
    </>
  );
}
