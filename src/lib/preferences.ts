/**
 * Small choices remembered across launches (microphone, model). Storage can
 * be unavailable (private profile, blocked site data); a preference is a
 * convenience, so failing to read or keep one is harmless.
 */
export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function savePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not remembered across launches; the in-memory choice still applies.
  }
}
