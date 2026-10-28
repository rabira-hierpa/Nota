import { create } from "zustand";
import { escapeHtml } from "@/features/notes/lib/escape-html";
import { indexNotes, isSameSection, notesInSection } from "@/features/notes/lib/note-sections";
import type { NoteSection } from "@/features/notes/lib/note-sections";
import { parseSearch } from "@/features/notes/lib/search";
import { selectedModel, useEngineStore } from "@/features/notes/stores/engine-store";
import { invokeDesktop } from "@/lib/desktop";
import { MAX_NOTE_TEXT_LENGTH } from "@shared/schemas/note";
import type { AttachAudioInput, CreateVoiceNoteInput, Note } from "@shared/types/note";
import type { Result } from "@shared/types/result";

export type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

/** A blob: URL for the selected note's recording. */
interface AudioSource {
  noteId: string;
  url: string;
}

interface NotesStore {
  notes: Note[];
  load: LoadState;
  selectedId: string | null;
  section: NoteSection;
  search: string;
  /** Notes with a transcription request in flight. */
  transcribingIds: string[];
  /** Bumped when a note's text is replaced from outside the editor (a transcription), so the editor reloads it. */
  textVersions: Record<string, number>;
  audio: AudioSource | null;
  /** The last action that failed, shown until the next one starts. */
  actionError: string | null;
  loadNotes: () => Promise<void>;
  select: (id: string | null) => Promise<void>;
  showSection: (section: NoteSection) => void;
  setSearch: (search: string) => void;
  createNote: () => Promise<void>;
  createVoiceNote: (input: CreateVoiceNoteInput) => Promise<Result<Note>>;
  saveContent: (id: string, content: string, text: string) => Promise<Result<Note>>;
  /** Adds text as a new paragraph at the end of a note that isn't open in the editor. */
  appendText: (id: string, text: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  moveToTrash: (id: string) => Promise<void>;
  restore: (id: string) => Promise<void>;
  deleteForever: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  attachAudio: (input: AttachAudioInput) => Promise<Result<Note>>;
  transcribe: (id: string) => Promise<void>;
  dismissError: () => void;
}

const WAV_TYPE = "audio/wav";
const EMPTY_TITLE = "<h1></h1>";
const NO_MODEL = "No speech model is available yet. Check the status at the bottom of the sidebar.";

function replaceNote(notes: Note[], next: Note): Note[] {
  return notes.map((note) => (note.id === next.id ? next : note));
}

/**
 * A reply to a favourite, trash or audio change carries the text as last
 * saved; the editor's newer, not-yet-saved text wins over it.
 */
function mergeReply(notes: Note[], reply: Note): Note[] {
  return notes.map((note) => {
    if (note.id !== reply.id) return note;
    const newer = note.updatedAt > reply.updatedAt;
    return newer ? { ...reply, content: note.content, text: note.text, updatedAt: note.updatedAt } : reply;
  });
}

/** What the note list shows right now; actions use it to pick the next note. */
export function visibleNotes({ notes, section, search }: Pick<NotesStore, "notes" | "section" | "search">): Note[] {
  return notesInSection(indexNotes(notes), section, parseSearch(search));
}

export const useNotesStore = create<NotesStore>()((set, get) => {
  async function loadAudio(note: Note | undefined): Promise<void> {
    const previous = get().audio;
    if (previous) URL.revokeObjectURL(previous.url);
    set({ audio: null });
    if (!note?.audio) return;

    const result = await invokeDesktop((api) => api.readAudio(note.id));
    const state = get();
    // The user may have moved on (or come back) while the audio loaded.
    if (state.selectedId !== note.id || state.audio?.noteId === note.id) return;
    if (!result.success) {
      set({ actionError: result.error });
      return;
    }
    const url = URL.createObjectURL(new Blob([new Uint8Array(result.data)], { type: WAV_TYPE }));
    set({ audio: { noteId: note.id, url } });
  }

  /** After a note leaves the list, open its neighbour, as Bear does. */
  async function selectNeighbourOf(id: string, before: Note[]): Promise<void> {
    if (get().selectedId !== id) return;
    const index = before.findIndex((note) => note.id === id);
    const after = visibleNotes(get());
    const next = after[Math.min(Math.max(index, 0), after.length - 1)];
    await get().select(next?.id ?? null);
  }

  /** Applies a reply about one note's favourite, trash or audio state, or reports why it failed. */
  function applyResult(result: Result<Note>): void {
    set((state) =>
      result.success
        ? { notes: mergeReply(state.notes, result.data), actionError: null }
        : { actionError: result.error },
    );
  }

  return {
    notes: [],
    load: { kind: "idle" },
    selectedId: null,
    section: { kind: "all" },
    search: "",
    transcribingIds: [],
    textVersions: {},
    audio: null,
    actionError: null,

    loadNotes: async () => {
      if (get().load.kind === "loading") return;
      set({ load: { kind: "loading" } });
      const result = await invokeDesktop((api) => api.listNotes());
      if (!result.success) {
        set({ load: { kind: "error", message: result.error } });
        return;
      }
      set({ notes: result.data, load: { kind: "ready" } });
      const first = visibleNotes(get())[0];
      if (first && get().selectedId === null) await get().select(first.id);
    },

    select: async (id) => {
      if (get().selectedId === id) return;
      set({ selectedId: id });
      await loadAudio(get().notes.find((note) => note.id === id));
    },

    showSection: (section) => {
      if (isSameSection(section, get().section)) return;
      set({ section });
      const visible = visibleNotes(get());
      if (!visible.some((note) => note.id === get().selectedId)) void get().select(visible[0]?.id ?? null);
    },

    setSearch: (search) => set({ search }),

    createNote: async () => {
      const { section } = get();
      // A new note in a tag's list starts with that tag, so it stays in the list.
      const tag = section.kind === "tag" ? `#${section.path}` : "";
      // An empty heading for the title, as in Bear.
      const content = `${EMPTY_TITLE}${tag ? `<p>${escapeHtml(tag)}</p>` : ""}`;
      const result = await invokeDesktop((api) => api.createNote({ content, text: tag }));
      if (!result.success) {
        set({ actionError: result.error });
        return;
      }
      const keepSection = section.kind === "all" || section.kind === "untagged" || section.kind === "tag";
      set((state) => ({
        notes: [result.data, ...state.notes],
        search: "",
        section: keepSection ? state.section : { kind: "all" },
        actionError: null,
      }));
      await get().select(result.data.id);
    },

    createVoiceNote: async (input) => {
      const result = await invokeDesktop((api) => api.createVoiceNote(input));
      if (!result.success) return result;
      set((state) => ({
        notes: [result.data, ...state.notes],
        search: "",
        section: state.section.kind === "voice" ? state.section : { kind: "all" },
        actionError: null,
      }));
      await get().select(result.data.id);
      void get().transcribe(result.data.id);
      return result;
    },

    saveContent: (id, content, text) => {
      // Optimistic: the list's title and preview follow the editor as the user types.
      const updatedAt = new Date().toISOString();
      set((state) => ({
        notes: state.notes.map((note) => (note.id === id ? { ...note, content, text, updatedAt } : note)),
      }));
      return invokeDesktop((api) => api.updateNoteContent({ id, content, text }));
    },

    appendText: async (id, text) => {
      const note = get().notes.find((candidate) => candidate.id === id);
      if (!note || !text.trim()) return;
      const content = `${note.content}<p>${escapeHtml(text.trim())}</p>`;
      const combined = [note.text, text.trim()].filter(Boolean).join("\n").slice(0, MAX_NOTE_TEXT_LENGTH);
      const result = await get().saveContent(id, content, combined);
      if (!result.success) set({ actionError: result.error });
    },

    toggleFavorite: async (id) => {
      const note = get().notes.find((candidate) => candidate.id === id);
      if (!note) return;
      applyResult(await invokeDesktop((api) => api.setFavorite({ id, favorite: !note.favorite })));
    },

    moveToTrash: async (id) => {
      const before = visibleNotes(get());
      const result = await invokeDesktop((api) => api.setTrashed({ id, trashed: true }));
      applyResult(result);
      if (result.success) await selectNeighbourOf(id, before);
    },

    restore: async (id) => {
      const before = visibleNotes(get());
      const result = await invokeDesktop((api) => api.setTrashed({ id, trashed: false }));
      applyResult(result);
      if (result.success) await selectNeighbourOf(id, before);
    },

    deleteForever: async (id) => {
      const before = visibleNotes(get());
      const result = await invokeDesktop((api) => api.deleteNote(id));
      if (!result.success) {
        set({ actionError: result.error });
        return;
      }
      set((state) => ({ notes: state.notes.filter((note) => note.id !== id), actionError: null }));
      await selectNeighbourOf(id, before);
    },

    emptyTrash: async () => {
      const result = await invokeDesktop((api) => api.emptyTrash());
      if (!result.success) {
        set({ actionError: result.error });
        return;
      }
      const gone = new Set(result.data.ids);
      set((state) => ({ notes: state.notes.filter((note) => !gone.has(note.id)), actionError: null }));
      if (get().selectedId !== null && gone.has(get().selectedId ?? "")) await get().select(null);
    },

    attachAudio: async (input) => {
      const result = await invokeDesktop((api) => api.attachAudio(input));
      applyResult(result);
      if (result.success && get().selectedId === input.id) await loadAudio(result.data);
      return result;
    },

    transcribe: async (id) => {
      if (get().transcribingIds.includes(id)) return;
      const model = selectedModel(useEngineStore.getState())?.model;
      if (!model) {
        set({ actionError: NO_MODEL });
        return;
      }
      set((state) => ({ transcribingIds: [...state.transcribingIds, id], actionError: null }));
      const result = await invokeDesktop((api) => api.transcribe({ id, model }));
      set((state) => ({
        transcribingIds: state.transcribingIds.filter((pending) => pending !== id),
        ...(result.success
          ? {
              notes: replaceNote(state.notes, result.data),
              textVersions: { ...state.textVersions, [id]: (state.textVersions[id] ?? 0) + 1 },
            }
          : { actionError: result.error }),
      }));
      // A failed run usually means the engine went away; refresh the indicator.
      if (!result.success || result.data.audio?.transcription.status === "error") {
        void useEngineStore.getState().check();
      }
    },

    dismissError: () => set({ actionError: null }),
  };
});
