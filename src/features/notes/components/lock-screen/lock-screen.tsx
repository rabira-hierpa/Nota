"use client";

import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock01 } from "@untitledui/icons";
import { firstLine } from "@/features/notes/lib/note-text";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import type { Note } from "@shared/types/note";
import { unlockFormSchema } from "./lock-screen.schema";
import type { UnlockForm } from "./lock-screen.schema";

interface LockScreenProps {
  note: Note;
}

/** A locked note before the password is given: its title, and a way in. */
export function LockScreen({ note }: LockScreenProps) {
  const unlockNotes = useNotesStore((state) => state.unlockNotes);
  const hasPassword = useNotesStore((state) => state.lockStatus.hasPassword);
  const passwordId = useId();
  const errorId = useId();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UnlockForm>({ resolver: zodResolver(unlockFormSchema) });

  const submit = handleSubmit(async ({ password }) => {
    const result = await unlockNotes(password);
    if (!result.success) setError("password", { message: result.error });
  });

  return (
    <main className="flex min-h-0 flex-col bg-paper">
      <div className="drag-region h-13 shrink-0 border-b border-line" />
      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-20 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Lock01 className="size-5" aria-hidden />
        </span>
        <h1 lang="am" className="mt-4 max-w-md truncate font-ethiopic text-xl font-semibold text-ink">
          {firstLine(note.text) || "Locked note"}
        </h1>
        <p className="mt-1 text-[13px] text-muted">This note is locked.</p>
        {hasPassword ? (
          <form onSubmit={(event) => void submit(event)} className="mt-6 w-full max-w-xs space-y-2 text-left" noValidate>
            <label htmlFor={passwordId} className="block text-xs font-medium text-muted">
              Password
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete="current-password"
              autoFocus
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? errorId : undefined}
              {...register("password")}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-[14px] text-ink focus:border-accent focus:outline-none aria-[invalid=true]:border-record"
            />
            {errors.password ? (
              <p id={errorId} role="alert" className="text-xs text-record">
                {errors.password.message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 w-full cursor-pointer rounded-lg bg-accent text-[13px] font-semibold text-on-accent transition-opacity duration-150 hover:opacity-90 disabled:cursor-progress disabled:opacity-60"
            >
              {isSubmitting ? "Unlocking…" : "Unlock notes"}
            </button>
            <p className="pt-1 text-[11px] leading-4 text-muted">
              Unlocks every locked note until you lock them again, or the Mac sleeps.
            </p>
          </form>
        ) : (
          <p className="mt-4 max-w-sm text-[13px] text-muted">
            This note was locked with a password that isn&apos;t on this Mac, so it can&apos;t be opened here.
          </p>
        )}
      </div>
    </main>
  );
}
