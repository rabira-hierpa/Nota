"use client";

import { useId } from "react";
import type { SVGProps } from "react";
import {
  Bold01,
  CheckSquare,
  Code02,
  Dotpoints01,
  Italic01,
  Minus,
  PenTool02,
  Strikethrough01,
  Underline01,
} from "@untitledui/icons";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { IconButton } from "@/features/notes/components/icon-button";
import { DEFAULT_FONT_LABEL, EDITOR_FONTS, editorFontOf, FONT_GROUPS } from "@/features/notes/lib/editor-fonts";

type BlockType = "paragraph" | "h1" | "h2" | "h3";

const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: "Body text",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
};
const HEADING_LEVELS = { h1: 1, h2: 2, h3: 3 } as const;
const SELECT_CLASS =
  "no-drag h-8 cursor-pointer truncate rounded-md bg-transparent px-1.5 text-xs font-medium text-ink hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40";

// Untitled UI has no numbered-list or quote icon; these follow its 24px, 2px-stroke style.
const STROKE_ICON: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  className: "size-4",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function blockTypeOf(editor: Editor): BlockType {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  return "paragraph";
}

function isBlockType(value: string): value is BlockType {
  return value in BLOCK_LABELS;
}

interface EditorToolbarProps {
  editor: Editor;
  disabled: boolean;
}

/** Formatting for the open note: font, text style, marks, lists and blocks. */
export function EditorToolbar({ editor, disabled }: EditorToolbarProps) {
  const fontId = useId();
  const blockId = useId();
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      font: editorFontOf(current.getAttributes("textStyle").fontFamily as string | undefined)?.id ?? "",
      block: blockTypeOf(current),
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      highlight: current.isActive("highlight"),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      taskList: current.isActive("taskList"),
      blockquote: current.isActive("blockquote"),
      codeBlock: current.isActive("codeBlock"),
    }),
  });
  const chain = () => editor.chain().focus();

  const setFont = (id: string) => {
    const font = EDITOR_FONTS.find((option) => option.id === id);
    if (font) chain().setFontFamily(font.family).run();
    else chain().unsetFontFamily().run();
  };

  const setBlock = (block: BlockType) => {
    if (block === "paragraph") chain().setParagraph().run();
    else chain().setHeading({ level: HEADING_LEVELS[block] }).run();
  };

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-line px-5 py-1.5">
      <label htmlFor={fontId} className="sr-only">
        Font
      </label>
      <select id={fontId} value={active.font} onChange={(event) => setFont(event.target.value)} disabled={disabled} className={`${SELECT_CLASS} w-36`}>
        <option value="">{DEFAULT_FONT_LABEL}</option>
        {FONT_GROUPS.map((group) => (
          <optgroup key={group} label={group}>
            {EDITOR_FONTS.filter((option) => option.group === group).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <label htmlFor={blockId} className="sr-only">
        Text style
      </label>
      <select
        id={blockId}
        value={active.block}
        onChange={(event) => {
          if (isBlockType(event.target.value)) setBlock(event.target.value);
        }}
        disabled={disabled}
        className={`${SELECT_CLASS} w-28`}
      >
        {Object.entries(BLOCK_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <span className="mx-1.5 h-5 w-px bg-line" aria-hidden />
      <IconButton label="Bold (⌘B)" pressed={active.bold} disabled={disabled} onClick={() => chain().toggleBold().run()}>
        <Bold01 className="size-4" />
      </IconButton>
      <IconButton label="Italic (⌘I)" pressed={active.italic} disabled={disabled} onClick={() => chain().toggleItalic().run()}>
        <Italic01 className="size-4" />
      </IconButton>
      <IconButton label="Underline (⌘U)" pressed={active.underline} disabled={disabled} onClick={() => chain().toggleUnderline().run()}>
        <Underline01 className="size-4" />
      </IconButton>
      <IconButton label="Strikethrough" pressed={active.strike} disabled={disabled} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough01 className="size-4" />
      </IconButton>
      <IconButton label="Highlight" pressed={active.highlight} disabled={disabled} onClick={() => chain().toggleHighlight().run()}>
        <PenTool02 className="size-4" />
      </IconButton>

      <span className="mx-1.5 h-5 w-px bg-line" aria-hidden />
      <IconButton label="Bulleted list" pressed={active.bulletList} disabled={disabled} onClick={() => chain().toggleBulletList().run()}>
        <Dotpoints01 className="size-4" />
      </IconButton>
      <IconButton label="Numbered list" pressed={active.orderedList} disabled={disabled} onClick={() => chain().toggleOrderedList().run()}>
        <svg {...STROKE_ICON}>
          <path d="M10 6h11M10 12h11M10 18h11M4 4.5h1.5V9M4 9h3M4 14.4c.4-.6 1-.9 1.6-.9.9 0 1.4.5 1.4 1.3 0 1.2-3 2.2-3 3.7h3" />
        </svg>
      </IconButton>
      <IconButton label="Checklist" pressed={active.taskList} disabled={disabled} onClick={() => chain().toggleTaskList().run()}>
        <CheckSquare className="size-4" />
      </IconButton>
      <IconButton label="Quote" pressed={active.blockquote} disabled={disabled} onClick={() => chain().toggleBlockquote().run()}>
        <svg {...STROKE_ICON}>
          <path d="M9 11H5.5a.5.5 0 0 1-.5-.5V7a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1v4c0 3-1.5 5-4 6M19 11h-3.5a.5.5 0 0 1-.5-.5V7a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1v4c0 3-1.5 5-4 6" />
        </svg>
      </IconButton>
      <IconButton label="Code block" pressed={active.codeBlock} disabled={disabled} onClick={() => chain().toggleCodeBlock().run()}>
        <Code02 className="size-4" />
      </IconButton>
      <IconButton label="Divider" disabled={disabled} onClick={() => chain().setHorizontalRule().run()}>
        <Minus className="size-4" />
      </IconButton>
    </div>
  );
}
