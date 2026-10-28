import type { Microphone } from "@/features/transcriber/types/microphone";

type DeviceLike = Pick<MediaDeviceInfo, "deviceId" | "kind" | "label">;

/** Chromium's aliases for "whatever the OS picks"; we list the real devices instead. */
const ALIAS_IDS = new Set(["default", "communications"]);
const DEFAULT_ALIAS_PREFIX = /^Default - /;
const USB_ID_SUFFIX = /\s*\([0-9a-f]{4}:[0-9a-f]{4}\)$/i;
const VIRTUAL_DEVICE =
  /\(virtual\)|blackhole|loopback|soundflower|teams audio|zoomaudio|zoom audio|krisp|vb-?cable|aggregate device/i;

/** The audio inputs worth offering, flagged so a silent virtual device is never the default. */
export function toMicrophones(devices: readonly DeviceLike[]): Microphone[] {
  const inputs = devices.filter((device) => device.kind === "audioinput");
  const defaultLabel = inputs.find((device) => device.deviceId === "default")?.label.replace(DEFAULT_ALIAS_PREFIX, "");
  return inputs
    .filter((device) => !ALIAS_IDS.has(device.deviceId))
    .map((device, index) => ({
      id: device.deviceId,
      label: device.label.replace(USB_ID_SUFFIX, "") || `Microphone ${index + 1}`,
      virtual: VIRTUAL_DEVICE.test(device.label),
      systemDefault: device.label !== "" && device.label === defaultLabel,
    }));
}

/**
 * Keeps the user's saved choice while that device is connected; otherwise
 * prefers the system default, then the built-in mic, skipping virtual devices.
 */
export function chooseMicrophone(microphones: readonly Microphone[], savedId: string | null): string | null {
  if (savedId && microphones.some((microphone) => microphone.id === savedId)) return savedId;
  const real = microphones.filter((microphone) => !microphone.virtual);
  const preferred =
    real.find((microphone) => microphone.systemDefault) ??
    real.find((microphone) => /built-in/i.test(microphone.label)) ??
    real[0] ??
    microphones[0];
  return preferred?.id ?? null;
}

/** What both the recorder and dictation ask getUserMedia for. */
export function audioConstraints(microphone: Microphone | null): MediaTrackConstraints {
  return {
    deviceId: microphone ? { exact: microphone.id } : undefined,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
  };
}
