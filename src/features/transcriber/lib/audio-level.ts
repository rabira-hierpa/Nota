/**
 * Peaks below −60 dBFS carry no speech. Digital silence (a virtual device
 * nothing is routed into) is exactly 0; a quiet room still reads ~0.01.
 */
export const SILENT_PEAK = 0.001;

/** Largest absolute sample value, 0…1. */
export function peakLevel(samples: Float32Array): number {
  let peak = 0;
  for (const sample of samples) {
    const magnitude = Math.abs(sample);
    if (magnitude > peak) peak = magnitude;
  }
  return peak;
}
