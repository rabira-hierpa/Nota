"use client";

import { useId } from "react";
import { SwitchVertical01 } from "@untitledui/icons";
import { SORT_LABELS } from "@/features/notes/lib/note-sections";
import type { SortOrder } from "@/features/notes/lib/note-sections";
import { useViewStore } from "@/features/notes/stores/view-store";

function isSortOrder(value: string): value is SortOrder {
  return value in SORT_LABELS;
}

/** How the note list is ordered; pinned notes stay on top either way. */
export function SortSelect() {
  const sort = useViewStore((state) => state.sort);
  const setSort = useViewStore((state) => state.setSort);
  const selectId = useId();

  return (
    <div className="no-drag relative flex items-center">
      <label htmlFor={selectId} className="sr-only">
        Sort notes by
      </label>
      <SwitchVertical01 className="pointer-events-none absolute left-2 size-3.5 text-muted" aria-hidden />
      <select
        id={selectId}
        value={sort}
        onChange={(event) => {
          if (isSortOrder(event.target.value)) setSort(event.target.value);
        }}
        title="Sort notes by"
        className="h-7 cursor-pointer appearance-none rounded-md bg-transparent pl-7 pr-2 text-xs font-medium text-muted hover:bg-hover hover:text-ink"
      >
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
