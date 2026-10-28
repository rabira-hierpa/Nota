"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Archive, DotsHorizontal, Download01, Lock01, LockUnlocked01, Pin02, Trash01 } from "@untitledui/icons";
import type { Editor } from "@tiptap/react";
import { formatAccelerator, isMacPlatform } from "@/features/notes/lib/accelerators";
import { onCommand } from "@/features/notes/lib/command-bus";
import { toHtmlDocument, toMarkdown } from "@/features/notes/lib/note-export";
import { firstLine } from "@/features/notes/lib/note-text";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useViewStore } from "@/features/notes/stores/view-store";
import { cx } from "@/utils/cx";
import { KEYMAP } from "@shared/keymap";
import type { CommandId } from "@shared/keymap";
import type { ExportFormat, Note } from "@shared/types/note";

const EXPORTS: { format: ExportFormat; label: string }[] = [
  { format: "md", label: "Markdown" },
  { format: "html", label: "Web page (HTML)" },
  { format: "txt", label: "Plain text" },
];

const ITEM_CLASS =
  "flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] text-ink hover:bg-hover focus-visible:bg-hover disabled:cursor-not-allowed disabled:opacity-40";

interface MenuAction {
  command: CommandId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  run: () => void;
  danger?: boolean;
}

interface NoteMenuProps {
  note: Note;
  editor: Editor | null;
}

/** The note's other actions, as in Bear's note menu: pin, archive, lock, export, trash. */
export function NoteMenu({ note, editor }: NoteMenuProps) {
  const togglePinned = useNotesStore((state) => state.togglePinned);
  const toggleArchived = useNotesStore((state) => state.toggleArchived);
  const toggleLocked = useNotesStore((state) => state.toggleLocked);
  const moveToTrash = useNotesStore((state) => state.moveToTrash);
  const exportNote = useNotesStore((state) => state.exportNote);
  const hasPassword = useNotesStore((state) => state.lockStatus.hasPassword);
  const openPasswordDialog = useViewStore((state) => state.openPasswordDialog);
  const popoverId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [exported, setExported] = useState<string | null>(null);
  const mac = useMemo(() => isMacPlatform(), []);

  const lockOrUnlock = () => {
    if (!note.lock && !hasPassword) openPasswordDialog(note.id);
    else void toggleLocked(note.id);
  };

  const actions: MenuAction[] = [
    { command: "togglePinned", label: note.pinned ? "Unpin" : "Pin to top", icon: Pin02, run: () => void togglePinned(note.id) },
    {
      command: "toggleArchived",
      label: note.archivedAt ? "Move out of the Archive" : "Archive",
      icon: Archive,
      run: () => void toggleArchived(note.id),
    },
    {
      command: "toggleLocked",
      label: note.lock ? "Remove lock" : "Lock note",
      icon: note.lock ? LockUnlocked01 : Lock01,
      run: lockOrUnlock,
    },
    { command: "moveToTrash", label: "Move to Trash", icon: Trash01, run: () => void moveToTrash(note.id), danger: true },
  ];

  const shortcutFor = (command: CommandId) => {
    const binding = KEYMAP.find((candidate) => candidate.command === command);
    return binding ? formatAccelerator(binding.accelerator, mac) : "";
  };

  const exportAs = async (format: ExportFormat) => {
    if (!editor) return;
    const title = firstLine(note.text) || "Note";
    const data =
      format === "md" ? toMarkdown(editor.getJSON()) : format === "html" ? toHtmlDocument(title, editor.getHTML()) : `${note.text}\n`;
    const result = await exportNote({ title, format, data });
    setExported(result.success ? (result.data.saved ? "Exported." : null) : result.error);
  };

  // The menu's commands work from the keyboard too, while this note is open.
  useEffect(() => {
    const offs = [
      onCommand("togglePinned", () => void togglePinned(note.id)),
      onCommand("toggleArchived", () => void toggleArchived(note.id)),
      onCommand("toggleLocked", () => {
        if (!note.lock && !hasPassword) openPasswordDialog(note.id);
        else void toggleLocked(note.id);
      }),
      onCommand("moveToTrash", () => void moveToTrash(note.id)),
      onCommand("exportNote", () => popoverRef.current?.showPopover()),
    ];
    return () => offs.forEach((off) => off());
  }, [hasPassword, moveToTrash, note.id, note.lock, openPasswordDialog, toggleArchived, toggleLocked, togglePinned]);

  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        aria-label="More actions"
        title="More actions"
        className="no-drag inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
      >
        <DotsHorizontal className="size-4" />
      </button>
      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        aria-label="Note actions"
        onToggle={() => setExported(null)}
        className="fixed inset-auto right-4 top-12 m-0 w-64 space-y-0.5 rounded-xl border border-line bg-surface p-1.5 text-ink shadow-xl"
      >
        {actions.map(({ command, label, icon: Icon, run, danger }) => (
          <button
            key={command}
            type="button"
            onClick={() => {
              popoverRef.current?.hidePopover();
              run();
            }}
            className={cx(ITEM_CLASS, danger && "hover:text-record")}
          >
            <Icon className="size-4 shrink-0 text-muted" />
            <span className="flex-1">{label}</span>
            <kbd className="font-sans text-[11px] text-muted">{shortcutFor(command)}</kbd>
          </button>
        ))}
        <div className="my-1 border-t border-line" role="presentation" />
        <p className="px-2.5 pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Export <span className="font-sans normal-case tracking-normal">{shortcutFor("exportNote")}</span>
        </p>
        {EXPORTS.map(({ format, label }) => (
          <button
            key={format}
            type="button"
            disabled={!editor}
            onClick={() => void exportAs(format)}
            className={ITEM_CLASS}
          >
            <Download01 className="size-4 shrink-0 text-muted" />
            {label}
          </button>
        ))}
        {exported ? (
          <p role="status" className="px-2.5 py-1 text-xs text-muted">
            {exported}
          </p>
        ) : null}
      </div>
    </>
  );
}
