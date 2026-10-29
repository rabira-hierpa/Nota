"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import { Archive, Calendar, CheckSquare, File06, Microphone02, Star01, Tag03, Trash03 } from "@untitledui/icons";
import { EngineStatus } from "@/features/notes/components/engine-status";
import { OnboardingDialog } from "@/features/notes/components/onboarding-dialog";
import { SectionLink } from "@/features/notes/components/section-link";
import { SetPasswordDialog } from "@/features/notes/components/set-password-dialog";
import { SettingsMenu } from "@/features/notes/components/settings-menu";
import { ShortcutsDialog } from "@/features/notes/components/shortcuts-dialog";
import { TagTree } from "@/features/notes/components/tag-tree";
import { useLibrary } from "@/features/notes/hooks/use-library";
import { useCommands } from "@/features/notes/hooks/use-commands";
import { useTheme } from "@/features/notes/hooks/use-theme";
import { useZenMode } from "@/features/notes/hooks/use-zen-mode";
import { SECTION_TITLES } from "@/features/notes/lib/note-sections";
import type { FixedSectionKind } from "@/features/notes/lib/note-sections";
import { useNotesStore } from "@/features/notes/stores/notes-store";

const SECTIONS: { kind: FixedSectionKind; icon: ComponentType<{ className?: string }> }[] = [
  { kind: "all", icon: File06 },
  { kind: "today", icon: Calendar },
  { kind: "todo", icon: CheckSquare },
  { kind: "favorites", icon: Star01 },
  { kind: "voice", icon: Microphone02 },
  { kind: "untagged", icon: Tag03 },
];

/** Left column, as in Bear: where to look (sections, then tags), with settings at the foot. */
export function NotesSidebar() {
  useTheme();
  useZenMode();
  useCommands();
  const { counts, tags } = useLibrary();
  const section = useNotesStore((state) => state.section);
  const showSection = useNotesStore((state) => state.showSection);

  return (
    <aside data-pane="library" className="flex min-h-0 flex-col border-r border-line bg-sidebar">
      {/* Room for the window's traffic lights, and a handle to move it. */}
      <div className="drag-region flex h-13 shrink-0 items-end justify-end px-4 pb-1">
        <span className="flex items-center gap-1.5 text-[13px] font-bold tracking-tight text-ink/80">
          <Image src="/icon.png" alt="" width={16} height={16} className="rounded" />
          Nota
        </span>
      </div>
      <nav aria-label="Library" className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4 pt-2">
        <ul className="space-y-0.5">
          {SECTIONS.map(({ kind, icon }) => (
            <li key={kind}>
              <SectionLink
                icon={icon}
                label={SECTION_TITLES[kind]}
                count={counts[kind]}
                active={section.kind === kind}
                onSelect={() => showSection({ kind })}
              />
            </li>
          ))}
        </ul>
        <TagTree tags={tags} />
        <ul className="mt-5 space-y-0.5">
          <li>
            <SectionLink
              icon={Archive}
              label={SECTION_TITLES.archive}
              count={counts.archive}
              active={section.kind === "archive"}
              onSelect={() => showSection({ kind: "archive" })}
            />
          </li>
          <li>
            <SectionLink
              icon={Trash03}
              label={SECTION_TITLES.trash}
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
      <SetPasswordDialog />
      <ShortcutsDialog />
      <OnboardingDialog />
    </aside>
  );
}
