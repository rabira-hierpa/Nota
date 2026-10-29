import { create } from "zustand";
import type { CalendarChoice } from "@/features/notes/lib/format";
import { SORT_ORDERS } from "@/features/notes/lib/note-sections";
import type { SortOrder } from "@/features/notes/lib/note-sections";
import { readPreference, savePreference } from "@/lib/preferences";

const SORT_KEY = "nota:sort";
const SIDEBAR_KEY = "nota:sidebar";
const CALENDAR_KEY = "nota:calendar";
const CALENDARS: readonly CalendarChoice[] = ["gregorian", "ethiopian", "both"];
const SIDEBAR_HIDDEN = "hidden";
const SIDEBAR_SHOWN = "shown";

/** The "set a password" dialog, and the note to lock once a password exists. */
interface PasswordDialog {
  open: boolean;
  lockAfter: string | null;
}

interface ViewStore {
  /** Zen mode: only the note, for distraction-free writing and dictation. */
  zen: boolean;
  /** The sidebar is folded away, leaving the note list and the note. */
  sidebarHidden: boolean;
  shortcutsOpen: boolean;
  passwordDialog: PasswordDialog;
  sort: SortOrder;
  /** Which calendar dates are shown in: Gregorian, Ethiopian, or both side by side. */
  calendar: CalendarChoice;
  /** Reads the saved view choices; call once on the client. */
  restore: () => void;
  setZen: (zen: boolean) => void;
  setSidebarHidden: (hidden: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  openPasswordDialog: (lockAfter: string | null) => void;
  closePasswordDialog: () => void;
  setSort: (sort: SortOrder) => void;
  setCalendar: (calendar: CalendarChoice) => void;
}

function isSortOrder(value: string | null): value is SortOrder {
  return SORT_ORDERS.some((order) => order === value);
}

function isCalendarChoice(value: string | null): value is CalendarChoice {
  return CALENDARS.some((calendar) => calendar === value);
}

export const useViewStore = create<ViewStore>()((set) => ({
  zen: false,
  sidebarHidden: false,
  shortcutsOpen: false,
  passwordDialog: { open: false, lockAfter: null },
  sort: "edited",
  calendar: "gregorian",

  restore: () => {
    const sort = readPreference(SORT_KEY);
    const calendar = readPreference(CALENDAR_KEY);
    set({
      sidebarHidden: readPreference(SIDEBAR_KEY) === SIDEBAR_HIDDEN,
      ...(isSortOrder(sort) ? { sort } : {}),
      ...(isCalendarChoice(calendar) ? { calendar } : {}),
    });
  },

  setZen: (zen) => set({ zen }),

  setSidebarHidden: (sidebarHidden) => {
    savePreference(SIDEBAR_KEY, sidebarHidden ? SIDEBAR_HIDDEN : SIDEBAR_SHOWN);
    set({ sidebarHidden });
  },

  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  openPasswordDialog: (lockAfter) => set({ passwordDialog: { open: true, lockAfter } }),
  closePasswordDialog: () => set({ passwordDialog: { open: false, lockAfter: null } }),

  setSort: (sort) => {
    savePreference(SORT_KEY, sort);
    set({ sort });
  },

  setCalendar: (calendar) => {
    savePreference(CALENDAR_KEY, calendar);
    set({ calendar });
  },
}));
