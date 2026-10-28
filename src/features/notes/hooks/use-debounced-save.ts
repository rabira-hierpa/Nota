"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Batches rapid edits into one save `delayMs` after the last keystroke.
 * `flush` saves immediately (on blur, and automatically on unmount).
 */
export function useDebouncedSave<T>(save: (value: T) => void, delayMs: number) {
  const saveRef = useRef(save);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Boxed, so a pending value that is itself falsy still counts as pending.
  const pendingRef = useRef<{ value: T } | null>(null);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) saveRef.current(pending.value);
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pendingRef.current = { value };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, delayMs);
    },
    [delayMs, flush],
  );

  useEffect(() => flush, [flush]);

  return { schedule, flush };
}
