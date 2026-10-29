"use client";

import { useState } from "react";
import { ChevronRight, Hash02 } from "@untitledui/icons";
import { SectionLink } from "@/features/notes/components/section-link";
import type { TagNode } from "@/features/notes/lib/tags";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useMessages } from "@/hooks/use-messages";
import { cx } from "@/utils/cx";

const ETHIOPIC = /[ሀ-᎟ⶀ-⷟꬀-꬯]/u;

interface TagTreeItemProps {
  node: TagNode;
}

/** A tag in the sidebar; nested tags fold under their parent, as in Bear. */
export function TagTreeItem({ node }: TagTreeItemProps) {
  const active = useNotesStore((state) => state.section.kind === "tag" && state.section.path === node.path);
  const showSection = useNotesStore((state) => state.showSection);
  // Which branches are open is this row's own, disposable view state.
  const [open, setOpen] = useState(false);
  const m = useMessages();
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className="flex items-center">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? m.sidebar.collapseTag(node.path) : m.sidebar.expandTag(node.path)}
            aria-expanded={open}
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted hover:bg-hover hover:text-ink"
          >
            <ChevronRight className={cx("size-3.5 transition-transform duration-150", open && "rotate-90")} />
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}
        <SectionLink
          icon={Hash02}
          label={node.name}
          count={node.count}
          active={active}
          onSelect={() => showSection({ kind: "tag", path: node.path })}
          lang={ETHIOPIC.test(node.name) ? "am" : undefined}
        />
      </div>
      {hasChildren && open ? (
        <ul className="ml-5 mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TagTreeItem key={child.path} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
