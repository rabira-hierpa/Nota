"use client";

import { useEffect } from "react";
import { useEngineStore } from "@/features/transcriber/stores/engine-store";

/** An engine can take a while to come up, so check often until it answers. */
const OFFLINE_POLL_MS = 5_000;
const ONLINE_POLL_MS = 30_000;

/** Keeps the engine indicator current. Mount once, from the status component. */
export function useEnginePolling(): void {
  const check = useEngineStore((state) => state.check);
  const online = useEngineStore((state) => state.status.kind === "online");

  useEffect(() => {
    void check();
    const timer = setInterval(() => void check(), online ? ONLINE_POLL_MS : OFFLINE_POLL_MS);
    return () => clearInterval(timer);
  }, [check, online]);
}
