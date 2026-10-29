"use client";

import { useMessages } from "@/hooks/use-messages";

export default function Error({ retry }: Readonly<{ retry: () => void }>) {
  const m = useMessages();
  return (
    <main className="grid h-full place-items-center p-8">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">{m.app.errorTitle}</h1>
        <p className="mt-2 text-sm text-muted">{m.app.errorBody}</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-5 cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:opacity-90"
        >
          {m.common.tryAgain}
        </button>
      </div>
    </main>
  );
}
