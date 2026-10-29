"use client";

import { useId } from "react";
import { SwitchVertical01 } from "@untitledui/icons";
import { SORT_ORDERS } from "@/features/notes/lib/note-sections";
import type { SortOrder } from "@/features/notes/lib/note-sections";
import { useViewStore } from "@/features/notes/stores/view-store";
import { useMessages } from "@/hooks/use-messages";
import { cx } from "@/utils/cx";

function isSortOrder(value: string): value is SortOrder {
  return SORT_ORDERS.some((order) => order === value);
}

/**
 * How the note list is ordered; pinned notes stay on top either way. A square
 * button beside the search field, with the native menu laid over it (which
 * ticks the current order); the icon turns green when it isn't the default.
 */
export function SortSelect() {
  const sort = useViewStore((state) => state.sort);
  const setSort = useViewStore((state) => state.setSort);
  const selectId = useId();
  const m = useMessages();
  const title = m.sort.sortedBy(m.sort[sort]);

  return (
    <div
      title={title}
      className={cx(
        "no-drag relative flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface transition-colors duration-150 hover:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
        sort === "edited" ? "text-muted" : "text-accent-ink",
      )}
    >
      <label htmlFor={selectId} className="sr-only">
        {m.sort.label}
      </label>
      <SwitchVertical01 className="pointer-events-none size-4" aria-hidden />
      <select
        id={selectId}
        value={sort}
        onChange={(event) => {
          if (isSortOrder(event.target.value)) setSort(event.target.value);
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {SORT_ORDERS.map((order) => (
          <option key={order} value={order}>
            {m.sort[order]}
          </option>
        ))}
      </select>
    </div>
  );
}
