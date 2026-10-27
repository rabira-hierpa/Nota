/**
 * `scheme://host[:port]` of a URL. Node's URL reports "null" as the origin of
 * custom schemes such as app://, so it is rebuilt by hand.
 */
export function originOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

export function isTrustedUrl(url: string, trustedOrigin: string): boolean {
  return originOf(url) === trustedOrigin;
}
