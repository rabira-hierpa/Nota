const MS_PER_SECOND = 1000;

/**
 * How long a recording runs, from its header alone: cheap, unlike decoding
 * it, so an hours-long file is refused before it fills memory. NaN when the
 * file doesn't say (WebM from a browser) or can't be read.
 */
export function mediaDurationMs(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  const audio = new Audio();
  return new Promise<number>((resolve) => {
    const finish = (ms: number) => {
      audio.removeAttribute("src");
      URL.revokeObjectURL(url);
      resolve(ms);
    };
    audio.addEventListener("loadedmetadata", () => finish(audio.duration * MS_PER_SECOND), { once: true });
    audio.addEventListener("error", () => finish(Number.NaN), { once: true });
    audio.preload = "metadata";
    audio.src = url;
  });
}
