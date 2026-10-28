import { describe, expect, it } from "vitest";
import { chooseMicrophone, toMicrophones } from "@/features/notes/lib/microphones";

// What Chromium reported on the Mac where recordings came out silent.
const macDevices = [
  { deviceId: "default", kind: "audioinput", label: "Default - BlackHole 2ch (Virtual)" },
  { deviceId: "rz", kind: "audioinput", label: "Rz Microphone" },
  { deviceId: "usb", kind: "audioinput", label: "DRELANMIC (0c76:120c)" },
  { deviceId: "blackhole", kind: "audioinput", label: "BlackHole 2ch (Virtual)" },
  { deviceId: "builtin", kind: "audioinput", label: "MacBook Pro Microphone (Built-in)" },
  { deviceId: "teams", kind: "audioinput", label: "Microsoft Teams Audio Device (Virtual)" },
  { deviceId: "speakers", kind: "audiooutput", label: "MacBook Pro Speakers (Built-in)" },
] as const;

describe("toMicrophones", () => {
  it("lists real inputs only, without the default alias, and flags virtual ones", () => {
    const microphones = toMicrophones(macDevices);
    expect(microphones.map((microphone) => [microphone.label, microphone.virtual])).toEqual([
      ["Rz Microphone", false],
      ["DRELANMIC", false],
      ["BlackHole 2ch (Virtual)", true],
      ["MacBook Pro Microphone (Built-in)", false],
      ["Microsoft Teams Audio Device (Virtual)", true],
    ]);
  });

  it("marks the device the OS uses as default", () => {
    const microphones = toMicrophones(macDevices);
    expect(microphones.filter((microphone) => microphone.systemDefault).map((microphone) => microphone.id)).toEqual([
      "blackhole",
    ]);
  });

  it("names unlabeled devices instead of showing blanks", () => {
    expect(toMicrophones([{ deviceId: "a", kind: "audioinput", label: "" }])[0].label).toBe("Microphone 1");
  });
});

describe("chooseMicrophone", () => {
  it("never defaults to a virtual device, even when the OS does", () => {
    expect(chooseMicrophone(toMicrophones(macDevices), null)).toBe("builtin");
  });

  it("follows the OS default when it is a real microphone", () => {
    const devices = [
      { deviceId: "default", kind: "audioinput", label: "Default - DRELANMIC (0c76:120c)" } as const,
      ...macDevices.slice(1),
    ];
    expect(chooseMicrophone(toMicrophones(devices), null)).toBe("usb");
  });

  it("keeps the saved choice while that device is connected, virtual or not", () => {
    const microphones = toMicrophones(macDevices);
    expect(chooseMicrophone(microphones, "blackhole")).toBe("blackhole");
    expect(chooseMicrophone(microphones, "unplugged")).toBe("builtin");
  });

  it("falls back to whatever exists, or nothing", () => {
    const onlyVirtual = toMicrophones([{ deviceId: "bh", kind: "audioinput", label: "BlackHole 2ch (Virtual)" }]);
    expect(chooseMicrophone(onlyVirtual, null)).toBe("bh");
    expect(chooseMicrophone([], null)).toBeNull();
  });
});
