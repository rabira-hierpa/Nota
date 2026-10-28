import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { LockStatus } from "@shared/types/note";

const CIPHER = "aes-256-gcm";
const KEY_BYTES = 32;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
/** scrypt cost: about 100 ms on an M-series Mac, so guessing passwords is slow. */
const SCRYPT_OPTIONS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
/** Sealed under the key when the password is set; opening it proves a later password is the same. */
const CHECK_PHRASE = "nota-lock-v1";

const vaultFileSchema = z.object({ version: z.literal(1), salt: z.base64(), check: z.base64() });

/** Locked notes can't be read or written until the user unlocks them. */
export class VaultLockedError extends Error {
  constructor() {
    super("The notes are locked");
    this.name = "VaultLockedError";
  }
}

export class WrongPasswordError extends Error {
  constructor() {
    super("Wrong password");
    this.name = "WrongPasswordError";
  }
}

export class PasswordExistsError extends Error {
  constructor() {
    super("A password is already set");
    this.name = "PasswordExistsError";
  }
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFC"), salt, KEY_BYTES, SCRYPT_OPTIONS, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

function seal(key: Buffer, plain: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(CIPHER, key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

/** Throws if the data was sealed under another key or has been tampered with. */
function open(key: Buffer, sealed: Buffer): Buffer {
  const decipher = createDecipheriv(CIPHER, key, sealed.subarray(0, IV_BYTES));
  decipher.setAuthTag(sealed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(sealed.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
}

/**
 * The key that seals locked notes, derived from the app password and held
 * in memory only while the notes are unlocked. The password itself is never
 * stored; vault.json keeps a salt and a sealed check phrase. There is no
 * recovery: without the password, locked notes stay sealed.
 */
export class NoteVault {
  private key: Buffer | null = null;

  constructor(private readonly file: string) {}

  async status(): Promise<LockStatus> {
    return { hasPassword: (await this.read()) !== null, unlocked: this.key !== null };
  }

  async setPassword(password: string): Promise<LockStatus> {
    if (await this.read()) throw new PasswordExistsError();
    const salt = randomBytes(SALT_BYTES);
    const key = await deriveKey(password, salt);
    const check = seal(key, Buffer.from(CHECK_PHRASE, "utf8"));
    await mkdir(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.tmp`;
    const contents = { version: 1, salt: salt.toString("base64"), check: check.toString("base64") };
    await writeFile(temp, JSON.stringify(contents), { encoding: "utf8", mode: 0o600 });
    await rename(temp, this.file);
    this.key = key;
    return this.status();
  }

  async unlock(password: string): Promise<LockStatus> {
    const vault = await this.read();
    if (!vault) throw new WrongPasswordError();
    const key = await deriveKey(password, Buffer.from(vault.salt, "base64"));
    try {
      if (open(key, Buffer.from(vault.check, "base64")).toString("utf8") !== CHECK_PHRASE) throw new Error("mismatch");
    } catch {
      throw new WrongPasswordError();
    }
    this.key = key;
    return this.status();
  }

  lock(): void {
    this.key?.fill(0);
    this.key = null;
  }

  isUnlocked(): boolean {
    return this.key !== null;
  }

  seal(plain: Buffer): Buffer {
    return seal(this.requireKey(), plain);
  }

  open(sealed: Buffer): Buffer {
    return open(this.requireKey(), sealed);
  }

  private requireKey(): Buffer {
    if (!this.key) throw new VaultLockedError();
    return this.key;
  }

  private async read(): Promise<z.infer<typeof vaultFileSchema> | null> {
    let raw: string;
    try {
      raw = await readFile(this.file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    return vaultFileSchema.parse(JSON.parse(raw));
  }
}
