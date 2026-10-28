"use client";

import { useEffect } from "react";
import { selectedModel, useEngineStore } from "@/features/transcriber/stores/engine-store";

/** A model can take a while to become available, so check often until it is. */
const OFFLINE_POLL_MS = 5_000;
const ONLINE_POLL_MS = 30_000;

/** Keeps the model list and its status current. Mount once, from the status component. */
export function useEnginePolling(): void {
  const check = useEngineStore((state) => state.check);
  const online = useEngineStore((state) => selectedModel(state)?.kind === "online");

  useEffect(() => {
    void check();
    const timer = setInterval(() => void check(), online ? ONLINE_POLL_MS : OFFLINE_POLL_MS);
    return () => clearInterval(timer);
  }, [check, online]);
}
