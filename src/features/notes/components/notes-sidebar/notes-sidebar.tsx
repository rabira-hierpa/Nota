"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import { Archive, Calendar, CheckSquare, File06, LayoutLeft, Microphone02, Star01, Tag03, Trash03 } from "@untitledui/icons";
import { EngineStatus } from "@/features/notes/components/engine-status";
import { IconButton } from "@/features/notes/components/icon-button";
import { SectionLink } from "@/features/notes/components/section-link";
import { SettingsMenu } from "@/features/notes/components/settings-menu";
import { TagTree } from "@/features/notes/components/tag-tree";
import { useLibrary } from "@/features/notes/hooks/use-library";
import { useCommands } from "@/features/notes/hooks/use-commands";
import { useSidebar } from "@/features/notes/hooks/use-sidebar";
import { useTheme } from "@/features/notes/hooks/use-theme";
import { useZenMode } from "@/features/notes/hooks/use-zen-mode";
import type { FixedSectionKind } from "@/features/notes/lib/note-sections";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useViewStore } from "@/features/notes/stores/view-store";
import { useLocale } from "@/hooks/use-locale";
import { useMessages } from "@/hooks/use-messages";

const SECTIONS: { kind: FixedSectionKind; icon: ComponentType<{ className?: string }> }[] = [
  { kind: "all", icon: File06 },
  { kind: "today", icon: Calendar },
  { kind: "todo", icon: CheckSquare },
  { kind: "favorites", icon: Star01 },
  { kind: "voice", icon: Microphone02 },
  { kind: "untagged", icon: Tag03 },
];

/**
 * Left column, as in Bear: where to look (sections, then tags), with settings
 * at the foot. It folds away (⌘⌥S) to give the list and the note more room.
 */
export function NotesSidebar() {
  useTheme();
  useLocale();
  useZenMode();
  useSidebar();
  useCommands();
  const { counts, tags } = useLibrary();
  const section = useNotesStore((state) => state.section);
  const showSection = useNotesStore((state) => state.showSection);
  const hidden = useViewStore((state) => state.sidebarHidden);
  const setSidebarHidden = useViewStore((state) => state.setSidebarHidden);
  const m = useMessages();

  return (
    // Folded, the column is 0 wide: the content keeps its width and is clipped, so it slides rather than squeezes.
    <aside data-pane="library" aria-label={m.sidebar.label} inert={hidden} className="min-h-0 overflow-hidden bg-sidebar">
      <div className="flex h-full w-(--sidebar-width) flex-col border-r border-line">
        {/* The app's name, a handle to move the window, and room for the traffic lights on a Mac. */}
        <div data-corner="sidebar" className="drag-region flex h-13 shrink-0 items-center gap-2 pl-5 pr-2.5">
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[14px] font-bold tracking-tight text-ink">
            <Image src="/icon.png" alt="" width={18} height={18} className="rounded" />
            Nota
          </span>
          <IconButton label={m.sidebar.hide} onClick={() => setSidebarHidden(true)}>
            <LayoutLeft className="size-4" />
          </IconButton>
        </div>
        <nav aria-label={m.sidebar.library} className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4 pt-1">
          <ul className="space-y-0.5">
            {SECTIONS.map(({ kind, icon }) => (
              <li key={kind}>
                <SectionLink
                  icon={icon}
                  label={m.sections[kind]}
                  count={counts[kind]}
                  active={section.kind === kind}
                  onSelect={() => showSection({ kind })}
                />
              </li>
            ))}
          </ul>
          <TagTree tags={tags} words={m.sidebar} />
          <ul className="mt-5 space-y-0.5">
            <li>
              <SectionLink
                icon={Archive}
                label={m.sections.archive}
                count={counts.archive}
                active={section.kind === "archive"}
                onSelect={() => showSection({ kind: "archive" })}
              />
            </li>
            <li>
              <SectionLink
                icon={Trash03}
                label={m.sections.trash}
                count={counts.trash}
                active={section.kind === "trash"}
                onSelect={() => showSection({ kind: "trash" })}
              />
            </li>
          </ul>
        </nav>
        <footer className="flex items-start gap-2 border-t border-line px-3 py-2.5">
          <EngineStatus />
          <SettingsMenu />
        </footer>
      </div>
    </aside>
  );
}
