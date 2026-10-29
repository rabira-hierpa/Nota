import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Onboarding } from "@main/lib/onboarding";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "nota-onboarding-"));
});

afterEach(() => rm(dir, { recursive: true, force: true }));

describe("Onboarding", () => {
  const marker = () => path.join(dir, "onboarded");

  it("shows on a fresh install until finished", async () => {
    const onboarding = new Onboarding(marker(), async () => false, false);

    expect(await onboarding.shouldShow()).toBe(true);
    await onboarding.complete();
    expect(await onboarding.shouldShow()).toBe(false);
  });

  it("doesn't interrupt someone who already has notes, or when turned off", async () => {
    expect(await new Onboarding(marker(), async () => true, false).shouldShow()).toBe(false);
    expect(await new Onboarding(marker(), async () => false, true).shouldShow()).toBe(false);
  });
});
