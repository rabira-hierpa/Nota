"use client";

import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useMessages } from "@/hooks/use-messages";

interface TrashBannerProps {
  noteId: string;
}

/** A note in the Trash is read-only: put it back, or delete it for good. */
export function TrashBanner({ noteId }: TrashBannerProps) {
  const restore = useNotesStore((state) => state.restore);
  const deleteForever = useNotesStore((state) => state.deleteForever);
  const m = useMessages();

  const confirmDelete = () => {
    if (window.confirm(m.trash.confirmDelete)) {
      void deleteForever(noteId);
    }
  };

  return (
    <div className="flex items-center gap-3 border-b border-line bg-sidebar px-6 py-2.5 text-[13px]">
      <p className="flex-1 text-muted">{m.trash.banner}</p>
      <button
        type="button"
        onClick={() => void restore(noteId)}
        className="h-8 cursor-pointer rounded-md px-3 font-semibold text-ink transition-colors duration-150 hover:bg-hover"
      >
        {m.trash.restore}
      </button>
      <button
        type="button"
        onClick={confirmDelete}
        className="h-8 cursor-pointer rounded-md bg-record px-3 font-semibold text-white transition-opacity duration-150 hover:opacity-90"
      >
        {m.trash.deleteForever}
      </button>
    </div>
  );
}
