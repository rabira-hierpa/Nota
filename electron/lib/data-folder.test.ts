import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DATA_FOLDER, LEGACY_DATA_FOLDER, resolveDataFolder } from "@main/lib/data-folder";

let appData: string;

beforeEach(async () => {
  appData = await mkdtemp(path.join(tmpdir(), "nota-appdata-"));
});

afterEach(() => rm(appData, { recursive: true, force: true }));

describe("resolveDataFolder", () => {
  it("moves the old folder, models and all, to the new name", async () => {
    await mkdir(path.join(appData, LEGACY_DATA_FOLDER, "models"), { recursive: true });
    await writeFile(path.join(appData, LEGACY_DATA_FOLDER, "models", "weights"), "x");

    expect(resolveDataFolder(appData)).toBe(path.join(appData, DATA_FOLDER));
    expect(await readdir(appData)).toEqual([DATA_FOLDER]);
    expect(await readdir(path.join(appData, DATA_FOLDER, "models"))).toEqual(["weights"]);
  });

  it("leaves both alone once the new folder exists", async () => {
    await mkdir(path.join(appData, LEGACY_DATA_FOLDER));
    await mkdir(path.join(appData, DATA_FOLDER));

    expect(resolveDataFolder(appData)).toBe(path.join(appData, DATA_FOLDER));
    expect((await readdir(appData)).sort()).toEqual([LEGACY_DATA_FOLDER, DATA_FOLDER].sort());
  });

  it("uses the new name on a fresh install", () => {
    expect(resolveDataFolder(appData)).toBe(path.join(appData, DATA_FOLDER));
  });
});
