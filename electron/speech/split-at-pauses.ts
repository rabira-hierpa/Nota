import { SAMPLE_RATE } from "@main/speech/wav";

/** Hohe reads at most 30 s at a time (it was trained on clips up to a minute). */
const MAX_CHUNK_SAMPLES = 30 * SAMPLE_RATE;
/** Where to look for a pause: the last 5 s of each 30 s window. */
const SEARCH_SAMPLES = 5 * SAMPLE_RATE;
const FRAME_SAMPLES = SAMPLE_RATE / 10;

/** The 100 ms frame with the least energy in `[from, from + SEARCH_SAMPLES)`; the first on a tie. */
function quietestFrame(audio: Int16Array, from: number): number {
  let quietest = 0;
  let lowest = Infinity;
  for (let frame = 0; frame < SEARCH_SAMPLES / FRAME_SAMPLES; frame++) {
    let energy = 0;
    const start = from + frame * FRAME_SAMPLES;
    for (let i = start; i < start + FRAME_SAMPLES; i++) energy += audio[i] * audio[i];
    if (energy < lowest) {
      lowest = energy;
      quietest = frame;
    }
  }
  return quietest;
}

/**
 * Pieces of at most 30 s, each cut in the middle of the quietest 100 ms of
 * its window's last 5 s, so words are rarely split. The same cuts as
 * `split_at_pauses` in electron/python/amharic_transcriber.py.
 */
export function splitAtPauses(audio: Int16Array): Int16Array[] {
  const pieces: Int16Array[] = [];
  let start = 0;
  while (audio.length - start > MAX_CHUNK_SAMPLES) {
    const searchFrom = start + MAX_CHUNK_SAMPLES - SEARCH_SAMPLES;
    const cut = searchFrom + quietestFrame(audio, searchFrom) * FRAME_SAMPLES + FRAME_SAMPLES / 2;
    pieces.push(audio.subarray(start, cut));
    start = cut;
  }
  pieces.push(audio.subarray(start));
  return pieces.filter((piece) => piece.length > 0);
}
