import { describe, expect, it } from "vitest";
import { transcriptToHtml, transcriptToText } from "@main/lib/transcript-html";

describe("transcriptToHtml", () => {
  it("makes one paragraph per line and escapes markup", () => {
    expect(transcriptToHtml("ሰላም <b>ዓለም</b> & \"you\"\n\n  ሁለት  ")).toBe(
      "<p>ሰላም &lt;b&gt;ዓለም&lt;/b&gt; &amp; &quot;you&quot;</p><p>ሁለት</p>",
    );
  });

  it("is empty for an empty transcript", () => {
    expect(transcriptToHtml("  \n ")).toBe("");
  });
});

describe("transcriptToText", () => {
  it("keeps one line per paragraph, without blank lines", () => {
    expect(transcriptToText("ሰላም\r\n\r\nሁለት ")).toBe("ሰላም\nሁለት");
  });
});
