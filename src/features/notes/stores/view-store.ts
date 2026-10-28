import { create } from "zustand";
import type { SortOrder } from "@/features/notes/lib/note-sections";
import { readPreference, savePreference } from "@/lib/preferences";

const SORT_KEY = "nota:sort";
const SORT_ORDERS: readonly SortOrder[] = ["edited", "created", "title"];

/** The "set a password" dialog, and the note to lock once a password exists. */
interface PasswordDialog {
  open: boolean;
  lockAfter: string | null;
}

interface ViewStore {
  /** Zen mode: only the note, for distraction-free writing and dictation. */
  zen: boolean;
  shortcutsOpen: boolean;
  passwordDialog: PasswordDialog;
  sort: SortOrder;
  /** Reads the saved sort order; call once on the client. */
  restore: () => void;
  setZen: (zen: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  openPasswordDialog: (lockAfter: string | null) => void;
  closePasswordDialog: () => void;
  setSort: (sort: SortOrder) => void;
}

function isSortOrder(value: string | null): value is SortOrder {
  return SORT_ORDERS.some((order) => order === value);
}

export const useViewStore = create<ViewStore>()((set) => ({
  zen: false,
  shortcutsOpen: false,
  passwordDialog: { open: false, lockAfter: null },
  sort: "edited",

  restore: () => {
    const saved = readPreference(SORT_KEY);
    if (isSortOrder(saved)) set({ sort: saved });
  },

  setZen: (zen) => set({ zen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  openPasswordDialog: (lockAfter) => set({ passwordDialog: { open: true, lockAfter } }),
  closePasswordDialog: () => set({ passwordDialog: { open: false, lockAfter: null } }),

  setSort: (sort) => {
    savePreference(SORT_KEY, sort);
    set({ sort });
  },
}));
