import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { toHtmlDocument, toMarkdown } from "@/features/notes/lib/note-export";

const text = (value: string, marks: string[] = []): JSONContent => ({
  type: "text",
  text: value,
  ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
});
const paragraph = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });

describe("toMarkdown", () => {
  it("writes headings, marks and paragraphs", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [text("የስብሰባ ማስታወሻ")] },
        paragraph(text("ሰላም "), text("ዓለም", ["bold"]), text(" and "), text("this", ["highlight"])),
        paragraph(text("a_b *c*")),
        { type: "paragraph" },
      ],
    };

    expect(toMarkdown(doc)).toBe("# የስብሰባ ማስታወሻ\n\nሰላም **ዓለም** and ==this==\n\na\\_b \\*c\\*\n");
  });

  it("writes lists, checklists, quotes, code and dividers", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("ዳቦ"))] }] },
        {
          type: "orderedList",
          attrs: { start: 1 },
          content: [
            { type: "listItem", content: [paragraph(text("one"))] },
            { type: "listItem", content: [paragraph(text("two"))] },
          ],
        },
        {
          type: "taskList",
          content: [
            { type: "taskItem", attrs: { checked: true }, content: [paragraph(text("done"))] },
            { type: "taskItem", attrs: { checked: false }, content: [paragraph(text("open"))] },
          ],
        },
        { type: "blockquote", content: [paragraph(text("quoted"))] },
        { type: "codeBlock", attrs: { language: "js" }, content: [{ type: "text", text: "let a_b = 1;" }] },
        { type: "horizontalRule" },
      ],
    };

    expect(toMarkdown(doc)).toBe(
      "- ዳቦ\n\n1. one\n2. two\n\n- [x] done\n- [ ] open\n\n> quoted\n\n```js\nlet a_b = 1;\n```\n\n---\n",
    );
  });
});

describe("toHtmlDocument", () => {
  it("wraps the note in a page marked as Amharic, escaping the title", () => {
    const page = toHtmlDocument("<ሰላም>", "<p>ሰላም</p>");

    expect(page).toContain('<html lang="am">');
    expect(page).toContain("<title>&lt;ሰላም&gt;</title>");
    expect(page).toContain("<body><p>ሰላም</p></body>");
  });
});
