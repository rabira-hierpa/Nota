"use client";

import { useId, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock01 } from "@untitledui/icons";
import { firstLine } from "@/features/notes/lib/note-text";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useMessages } from "@/hooks/use-messages";
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
  const m = useMessages();
  const schema = useMemo(() => unlockFormSchema(m.lock), [m]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UnlockForm>({ resolver: zodResolver(schema) });

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
          {firstLine(note.text) || m.lock.lockedNote}
        </h1>
        <p className="mt-1 text-[13px] text-muted">{m.lock.isLocked}</p>
        {hasPassword ? (
          <form onSubmit={(event) => void submit(event)} className="mt-6 w-full max-w-xs space-y-2 text-left" noValidate>
            <label htmlFor={passwordId} className="block text-xs font-medium text-muted">
              {m.lock.password}
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
                {m.translate(errors.password.message ?? "")}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 w-full cursor-pointer rounded-lg bg-accent text-[13px] font-semibold text-on-accent transition-opacity duration-150 hover:opacity-90 disabled:cursor-progress disabled:opacity-60"
            >
              {isSubmitting ? m.lock.unlocking : m.lock.unlock}
            </button>
            <p className="pt-1 text-[11px] leading-4 text-muted">
              {m.lock.hint}
            </p>
          </form>
        ) : (
          <p className="mt-4 max-w-sm text-[13px] text-muted">
            {m.lock.elsewhere}
          </p>
        )}
      </div>
    </main>
  );
}
