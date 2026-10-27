import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveExportPath } from "@main/lib/static-path";

const root = path.resolve("/app/out");

describe("resolveExportPath", () => {
  it("serves index.html at the root", () => {
    expect(resolveExportPath(root, "/")).toBe(path.join(root, "index.html"));
  });

  it("adds .html to extensionless routes", () => {
    expect(resolveExportPath(root, "/_not-found")).toBe(path.join(root, "_not-found.html"));
  });

  it("serves assets as they are", () => {
    expect(resolveExportPath(root, "/_next/static/chunks/app.js")).toBe(
      path.join(root, "_next/static/chunks/app.js"),
    );
  });

  it("refuses to leave the export folder", () => {
    expect(resolveExportPath(root, "/../secrets.txt")).toBeNull();
    expect(resolveExportPath(root, "/%2e%2e/%2e%2e/etc/passwd")).toBeNull();
  });

  it("refuses malformed escapes and NUL bytes", () => {
    expect(resolveExportPath(root, "/%E0%A4%A")).toBeNull();
    expect(resolveExportPath(root, "/index.html%00.js")).toBeNull();
  });
});
