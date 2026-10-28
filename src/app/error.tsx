"use client";

export default function Error({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <main className="grid h-full place-items-center p-8">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">Your notes are safe on disk. Try loading the screen again.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-5 cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
