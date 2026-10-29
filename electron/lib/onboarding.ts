import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Whether to show the setup guide: on the first launch of a fresh install
 * (no notes yet), until the user finishes or skips it. Someone upgrading with
 * notes already has a working setup and isn't interrupted; the guide stays
 * one click away in Settings.
 */
export class Onboarding {
  constructor(
    private readonly marker: string,
    private readonly hasNotes: () => Promise<boolean>,
    private readonly disabled: boolean,
  ) {}

  async shouldShow(): Promise<boolean> {
    if (this.disabled) return false;
    try {
      await access(this.marker);
      return false;
    } catch {
      return !(await this.hasNotes());
    }
  }

  async complete(): Promise<void> {
    await mkdir(path.dirname(this.marker), { recursive: true });
    await writeFile(this.marker, `${new Date().toISOString()}\n`, "utf8");
  }
}
