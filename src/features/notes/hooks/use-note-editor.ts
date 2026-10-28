"use client";

import { useCallback, useEffect, useState } from "react";
import { FontFamily, TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { useDebouncedSave } from "@/features/notes/hooks/use-debounced-save";
import { Hashtags } from "@/features/notes/lib/hashtag-extension";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { MAX_NOTE_HTML_LENGTH, MAX_NOTE_TEXT_LENGTH } from "@shared/schemas/note";
import type { Note } from "@shared/types/note";

export type SaveState = "idle" | "saving" | "saved" | "failed" | "too-long";

interface Snapshot {
  content: string;
  text: string;
}

const SAVE_DELAY_MS = 600;
const TITLE_PLACEHOLDER = "Title";
/** One line per paragraph, matching how the main process writes transcripts. */
const BLOCK_SEPARATOR = "\n";

function snapshot(editor: Editor): Snapshot {
  return { content: editor.getHTML(), text: editor.getText({ blockSeparator: BLOCK_SEPARATOR }) };
}

/**
 * The Tiptap editor for one note, saving as the user types. Uncontrolled:
 * the caller remounts it (via `key`) when the note's text is replaced from
 * outside, such as by a new transcription, and when a transcription starts
 * or ends (the placeholder is fixed for each mount).
 */
export function useNoteEditor(note: Note, readOnly: boolean, placeholder: string) {
  const saveContent = useNotesStore((state) => state.saveContent);
  const showSection = useNotesStore((state) => state.showSection);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const save = useCallback(
    ({ content, text }: Snapshot) => {
      if (content.length > MAX_NOTE_HTML_LENGTH || text.length > MAX_NOTE_TEXT_LENGTH) {
        setSaveState("too-long");
        return;
      }
      setSaveState("saving");
      saveContent(note.id, content, text)
        .then((result) => setSaveState(result.success ? "saved" : "failed"))
        .catch(() => setSaveState("failed"));
    },
    [note.id, saveContent],
  );
  const { schedule, flush } = useDebouncedSave(save, SAVE_DELAY_MS);

  const editor = useEditor({
    // Static export: render on the client only, never during prerendering.
    immediatelyRender: false,
    editable: !readOnly,
    content: note.content,
    // A blank note opens ready to type its title, as in Bear.
    autofocus: !readOnly && note.text.trim() === "" && !note.audio ? "start" : false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      TextStyle,
      FontFamily,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: ({ node }) => (node.type.name === "heading" ? TITLE_PLACEHOLDER : placeholder),
      }),
      Hashtags.configure({ onTagClick: (tag) => showSection({ kind: "tag", path: tag }) }),
    ],
    editorProps: {
      attributes: {
        class: "nota-editor",
        lang: "am",
        spellcheck: "false",
        "aria-label": "Note",
      },
    },
    onUpdate: ({ editor: updated }) => schedule(snapshot(updated)),
    onBlur: () => flush(),
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  return { editor, saveState };
}
