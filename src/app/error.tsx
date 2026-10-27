"use client";

export default function Error({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <main className="grid h-full place-items-center p-8">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">Your recordings are safe on disk. Try loading the screen again.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
