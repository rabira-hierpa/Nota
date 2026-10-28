import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NoteVault, PasswordExistsError, VaultLockedError, WrongPasswordError } from "@main/lib/note-vault";

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "nota-vault-"));
  file = path.join(dir, "vault.json");
});

afterEach(() => rm(dir, { recursive: true, force: true }));

describe("NoteVault", () => {
  it("has no password at first, and seals nothing until one is set", async () => {
    const vault = new NoteVault(file);

    expect(await vault.status()).toEqual({ hasPassword: false, unlocked: false });
    expect(() => vault.seal(Buffer.from("x"))).toThrow(VaultLockedError);
  });

  it("seals and opens with the key from the password, and never stores the password", async () => {
    const vault = new NoteVault(file);
    expect(await vault.setPassword("ሰላም-123")).toEqual({ hasPassword: true, unlocked: true });

    const sealed = vault.seal(Buffer.from("ሚስጥር", "utf8"));
    expect(sealed.toString("utf8")).not.toContain("ሚስጥር");
    expect(vault.open(sealed).toString("utf8")).toBe("ሚስጥር");
    expect(await readFile(file, "utf8")).not.toContain("ሰላም-123");
  });

  it("opens after a restart with the right password only", async () => {
    const first = new NoteVault(file);
    await first.setPassword("ሰላም-123");
    const sealed = first.seal(Buffer.from("note"));

    const restarted = new NoteVault(file);
    expect(await restarted.status()).toEqual({ hasPassword: true, unlocked: false });
    await expect(restarted.unlock("wrong-guess")).rejects.toBeInstanceOf(WrongPasswordError);
    await restarted.unlock("ሰላም-123");
    expect(restarted.open(sealed).toString()).toBe("note");
  });

  it("forgets the key when locked", async () => {
    const vault = new NoteVault(file);
    await vault.setPassword("ሰላም-123");
    const sealed = vault.seal(Buffer.from("note"));
    vault.lock();

    expect(() => vault.open(sealed)).toThrow(VaultLockedError);
    expect(await vault.status()).toEqual({ hasPassword: true, unlocked: false });
  });

  it("detects tampering", async () => {
    const vault = new NoteVault(file);
    await vault.setPassword("ሰላም-123");
    const sealed = vault.seal(Buffer.from("note"));
    sealed[sealed.length - 1] ^= 1;

    expect(() => vault.open(sealed)).toThrow();
  });

  it("won't replace a password that is already set", async () => {
    const vault = new NoteVault(file);
    await vault.setPassword("ሰላም-123");
    await expect(vault.setPassword("another-one")).rejects.toBeInstanceOf(PasswordExistsError);
  });
});
