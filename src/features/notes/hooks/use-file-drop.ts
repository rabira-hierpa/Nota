"use client";

import { useCallback, useState } from "react";
import type { DragEvent } from "react";

function carriesFiles(event: DragEvent<HTMLElement>): boolean {
  return event.dataTransfer.types.includes("Files");
}

/** Files dragged in from Finder or Explorer onto an element, with a flag to show where they'll land. */
export function useFileDrop(onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);

  const onDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    if (!carriesFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setOver(true);
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    // Moving between the element's own children fires leave events too.
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setOver(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      setOver(false);
      onFiles([...event.dataTransfer.files]);
    },
    [onFiles],
  );

  return { over, dropHandlers: { onDragOver, onDragLeave, onDrop } };
}
