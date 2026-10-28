import type { JSONContent } from "@tiptap/core";
import { escapeHtml } from "@/features/notes/lib/escape-html";

/** Characters that would turn into Markdown syntax if left bare. */
const MARKDOWN_SPECIAL = /([\\`*_[\]])/g;
const LIST_INDENT = "  ";

type Mark = NonNullable<JSONContent["marks"]>[number];

const MARK_WRAPPERS: Record<string, [string, string]> = {
  bold: ["**", "**"],
  italic: ["_", "_"],
  strike: ["~~", "~~"],
  code: ["`", "`"],
  highlight: ["==", "=="],
  underline: ["<u>", "</u>"],
};

function wrapMark(text: string, mark: Mark): string {
  if (mark.type === "link") return `[${text}](${String(mark.attrs?.href ?? "")})`;
  const wrapper = MARK_WRAPPERS[mark.type];
  return wrapper ? `${wrapper[0]}${text}${wrapper[1]}` : text;
}

function inlineMarkdown(nodes: readonly JSONContent[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "  \n";
      const marks = node.marks ?? [];
      const isCode = marks.some((mark) => mark.type === "code");
      const text = isCode ? (node.text ?? "") : (node.text ?? "").replace(MARKDOWN_SPECIAL, "\\$1");
      return marks.reduce(wrapMark, text);
    })
    .join("");
}

function indent(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line, index) => (index === 0 ? line : `${prefix}${line}`))
    .join("\n");
}

function listItems(node: JSONContent, marker: (index: number, item: JSONContent) => string): string {
  return (node.content ?? [])
    .map((item, index) => {
      const head = marker(index, item);
      const body = (item.content ?? []).map((child) => blockMarkdown(child)).join("\n");
      return `${head}${indent(body, LIST_INDENT.padEnd(head.length, " "))}`;
    })
    .join("\n");
}

function blockMarkdown(node: JSONContent): string {
  switch (node.type) {
    case "heading":
      return `${"#".repeat(Number(node.attrs?.level ?? 1))} ${inlineMarkdown(node.content)}`;
    case "paragraph":
      return inlineMarkdown(node.content);
    case "bulletList":
      return listItems(node, () => "- ");
    case "orderedList": {
      const start = Number(node.attrs?.start ?? 1);
      return listItems(node, (index) => `${start + index}. `);
    }
    case "taskList":
      return listItems(node, (_, item) => (item.attrs?.checked ? "- [x] " : "- [ ] "));
    case "blockquote":
      return (node.content ?? [])
        .map((child) => blockMarkdown(child))
        .join("\n\n")
        .split("\n")
        .map((line) => `> ${line}`.trimEnd())
        .join("\n");
    case "codeBlock": {
      const code = (node.content ?? []).map((child) => child.text ?? "").join("");
      return `\`\`\`${String(node.attrs?.language ?? "")}\n${code}\n\`\`\``;
    }
    case "horizontalRule":
      return "---";
    default:
      return inlineMarkdown(node.content);
  }
}

/** The editor's document as Markdown (Bear-flavoured: ==highlight==, - [ ] checklists). */
export function toMarkdown(doc: JSONContent): string {
  const blocks = (doc.content ?? []).map((node) => blockMarkdown(node)).filter((block, index, all) => {
    // Drop the empty paragraphs the editor keeps at the end.
    return block.trim() !== "" || all.slice(index + 1).some((rest) => rest.trim() !== "");
  });
  return `${blocks.join("\n\n").trim()}\n`;
}

/** A standalone web page for the note, readable without Nota. */
export function toHtmlDocument(title: string, html: string): string {
  return [
    "<!doctype html>",
    '<html lang="am">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title || "Note")}</title>`,
    "<style>body{max-width:42rem;margin:3rem auto;padding:0 1rem;font:17px/1.75 'Noto Sans Ethiopic',system-ui,sans-serif;color:#1d2a21}mark{background:#f8e7a6}blockquote{border-left:3px solid #15803d;margin-left:0;padding-left:1em;color:#5d6b61}pre{background:#eef2ec;padding:.8em 1em;border-radius:8px;overflow-x:auto}</style>",
    "</head>",
    `<body>${html}</body>`,
    "</html>",
    "",
  ].join("\n");
}
