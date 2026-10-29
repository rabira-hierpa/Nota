"use client";

import { SearchSm, XClose } from "@untitledui/icons";
import { SEARCH_INPUT_ID } from "@/features/notes/hooks/use-commands";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useMessages } from "@/hooks/use-messages";

/** Searches the current section as you type; `#tag` narrows by tag. ⌘F focuses it, Escape clears it. */
export function SearchField() {
  const search = useNotesStore((state) => state.search);
  const setSearch = useNotesStore((state) => state.setSearch);
  const m = useMessages();

  return (
    <div className="no-drag relative min-w-0 flex-1">
      <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
        {m.search.label}
      </label>
      <SearchSm className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id={SEARCH_INPUT_ID}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setSearch("");
        }}
        placeholder={m.search.placeholder}
        spellCheck={false}
        className="h-8 w-full rounded-lg border border-line bg-surface pl-8 pr-8 text-[13px] text-ink placeholder:text-muted focus:border-accent focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {search ? (
        <button
          type="button"
          onClick={() => setSearch("")}
          aria-label={m.search.clear}
          className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted hover:bg-hover hover:text-ink"
        >
          <XClose className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
