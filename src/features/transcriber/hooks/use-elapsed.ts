"use client";

import { useEffect, useState } from "react";

const TICK_MS = 250;

/** Milliseconds since `startedAt`, ticking while it is set. */
export function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [startedAt]);

  return startedAt === null ? 0 : Math.max(0, now - startedAt);
}
