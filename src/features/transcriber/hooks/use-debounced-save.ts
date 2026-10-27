"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Batches rapid edits into one save `delayMs` after the last keystroke.
 * `flush` saves immediately (on blur, and automatically on unmount).
 */
export function useDebouncedSave(save: (value: string) => void, delayMs: number) {
  const saveRef = useRef(save);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending !== null) saveRef.current(pending);
  }, []);

  const schedule = useCallback(
    (value: string) => {
      pendingRef.current = value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, delayMs);
    },
    [delayMs, flush],
  );

  useEffect(() => flush, [flush]);

  return { schedule, flush };
}
