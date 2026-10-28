import { create } from "zustand";
import { escapeHtml } from "@/features/notes/lib/escape-html";
import { findLinkedNote } from "@/features/notes/lib/note-links";
import { indexNotes, isInSection, isSameSection, notesInSection } from "@/features/notes/lib/note-sections";
import type { NoteSection, SortOrder } from "@/features/notes/lib/note-sections";
import { parseSearch } from "@/features/notes/lib/search";
import { selectedModel, useEngineStore } from "@/features/notes/stores/engine-store";
import { useViewStore } from "@/features/notes/stores/view-store";
import { invokeDesktop } from "@/lib/desktop";
import { MAX_NOTE_TEXT_LENGTH } from "@shared/schemas/note";
import type { AttachAudioInput, CreateVoiceNoteInput, ExportNoteInput, LockStatus, Note } from "@shared/types/note";
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
  lockStatus: LockStatus;
  /** Locked notes whose text has been opened this session (while the notes are unlocked). */
  openedIds: string[];
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
  togglePinned: (id: string) => Promise<void>;
  toggleArchived: (id: string) => Promise<void>;
  /** Locks the note, or removes its lock. Locking needs an app password and the notes unlocked. */
  toggleLocked: (id: string) => Promise<Result<Note>>;
  setLockPassword: (password: string) => Promise<Result<LockStatus>>;
  unlockNotes: (password: string) => Promise<Result<LockStatus>>;
  /** Closes every locked note; they need the password again. */
  lockNotes: () => Promise<void>;
  /** Follows a `[[link]]`: opens the note with that title, or starts one. */
  openLink: (title: string) => Promise<void>;
  exportNote: (input: ExportNoteInput) => Promise<Result<{ saved: boolean }>>;
  dismissError: () => void;
}

const WAV_TYPE = "audio/wav";
const EMPTY_TITLE = "<h1></h1>";
const NO_MODEL = "No speech model is available yet. Check the status at the bottom of the sidebar.";
const LOCKED: LockStatus = { hasPassword: false, unlocked: false };

/** A locked note shows only its title until opened with the password. */
export function isSealed(note: Note, openedIds: readonly string[]): boolean {
  return note.lock !== null && !openedIds.includes(note.id);
}

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
export function visibleNotes(
  { notes, section, search }: Pick<NotesStore, "notes" | "section" | "search">,
  sort: SortOrder = useViewStore.getState().sort,
): Note[] {
  return notesInSection(indexNotes(notes), section, parseSearch(search), sort);
}

export const useNotesStore = create<NotesStore>()((set, get) => {
  async function loadAudio(note: Note | undefined): Promise<void> {
    const previous = get().audio;
    if (previous) URL.revokeObjectURL(previous.url);
    set({ audio: null });
    // A sealed note's recording is sealed too.
    if (!note?.audio || isSealed(note, get().openedIds)) return;

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

  /** Opens a locked note's text, if the notes are unlocked. */
  async function openIfLocked(note: Note | undefined): Promise<void> {
    if (!note || !isSealed(note, get().openedIds) || !get().lockStatus.unlocked) return;
    const result = await invokeDesktop((api) => api.openLockedNote(note.id));
    if (!result.success) {
      set({ actionError: result.error });
      return;
    }
    set((state) => ({
      notes: replaceNote(state.notes, result.data),
      openedIds: [...state.openedIds, note.id],
    }));
  }

  async function refreshLock(): Promise<void> {
    const result = await invokeDesktop((api) => api.getLockStatus());
    if (result.success) set({ lockStatus: result.data });
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
    lockStatus: LOCKED,
    openedIds: [],

    loadNotes: async () => {
      if (get().load.kind === "loading") return;
      set({ load: { kind: "loading" } });
      await refreshLock();
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
      await openIfLocked(get().notes.find((note) => note.id === id));
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
      const current = get().notes.find((note) => note.id === id);
      // Nothing changed (the editor reported an update that wasn't an edit):
      // keep the note's edit time, and its place in the list.
      if (current && current.content === content && current.text === text) {
        return Promise.resolve({ success: true, data: current });
      }
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

    togglePinned: async (id) => {
      const note = get().notes.find((candidate) => candidate.id === id);
      if (note) applyResult(await invokeDesktop((api) => api.setPinned({ id, pinned: !note.pinned })));
    },

    toggleArchived: async (id) => {
      const note = get().notes.find((candidate) => candidate.id === id);
      if (!note) return;
      const before = visibleNotes(get());
      const result = await invokeDesktop((api) => api.setArchived({ id, archived: note.archivedAt === null }));
      applyResult(result);
      if (result.success) await selectNeighbourOf(id, before);
    },

    toggleLocked: async (id) => {
      const note = get().notes.find((candidate) => candidate.id === id);
      if (!note) return { success: false, error: "That note no longer exists." };
      const result = await invokeDesktop((api) => api.setLocked({ id, locked: note.lock === null }));
      if (!result.success) {
        set({ actionError: result.error });
        return result;
      }
      set((state) => ({
        notes: mergeReply(state.notes, result.data),
        openedIds: result.data.lock ? [...new Set([...state.openedIds, id])] : state.openedIds.filter((each) => each !== id),
        actionError: null,
      }));
      return result;
    },

    setLockPassword: async (password) => {
      const result = await invokeDesktop((api) => api.setLockPassword(password));
      if (result.success) set({ lockStatus: result.data });
      return result;
    },

    unlockNotes: async (password) => {
      const result = await invokeDesktop((api) => api.unlockNotes(password));
      if (!result.success) return result;
      set({ lockStatus: result.data, actionError: null });
      const selected = get().notes.find((note) => note.id === get().selectedId);
      await openIfLocked(selected);
      await loadAudio(get().notes.find((note) => note.id === get().selectedId));
      return result;
    },

    lockNotes: async () => {
      // Close open locked notes first: their editors save any last edit as they go.
      set({ openedIds: [] });
      await new Promise((resolve) => setTimeout(resolve, 0));
      await invokeDesktop((api) => api.lockNotes());
      const [status, listed] = await Promise.all([
        invokeDesktop((api) => api.getLockStatus()),
        invokeDesktop((api) => api.listNotes()),
      ]);
      set({
        ...(status.success ? { lockStatus: status.data } : {}),
        ...(listed.success ? { notes: listed.data } : {}),
        openedIds: [],
      });
      await loadAudio(get().notes.find((note) => note.id === get().selectedId));
    },

    openLink: async (title) => {
      const target = findLinkedNote(get().notes, title);
      if (!target) {
        const result = await invokeDesktop((api) =>
          api.createNote({ content: `<h1>${escapeHtml(title)}</h1>`, text: title }),
        );
        if (!result.success) {
          set({ actionError: result.error });
          return;
        }
        set((state) => ({ notes: [result.data, ...state.notes], section: { kind: "all" }, search: "" }));
        await get().select(result.data.id);
        return;
      }
      const entry = indexNotes([target])[0];
      if (entry && !isInSection(entry, get().section)) {
        set({ section: target.archivedAt ? { kind: "archive" } : { kind: "all" }, search: "" });
      }
      await get().select(target.id);
    },

    exportNote: (input) => invokeDesktop((api) => api.exportNote(input)),

    dismissError: () => set({ actionError: null }),
  };
});
