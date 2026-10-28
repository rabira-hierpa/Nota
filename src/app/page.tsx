import type { Metadata } from "next";
import { NoteList } from "@/features/notes/components/note-list";
import { NotePane } from "@/features/notes/components/note-pane";
import { NotesSidebar } from "@/features/notes/components/notes-sidebar";

export const metadata: Metadata = {
  title: "Nota",
};

/** Bear's three columns: where to look, what's there, and the note itself. */
export default function HomePage() {
  return (
    <div className="notes-grid grid h-full grid-cols-[224px_300px_minmax(0,1fr)] max-[960px]:grid-cols-[200px_260px_minmax(0,1fr)]">
      <NotesSidebar />
      <NoteList />
      <NotePane />
    </div>
  );
}
