"use client";

import { useEffect, useId, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useViewStore } from "@/features/notes/stores/view-store";
import { setPasswordFormSchema } from "./set-password-dialog.schema";
import type { SetPasswordForm } from "./set-password-dialog.schema";

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-line bg-paper px-3 text-[14px] text-ink focus:border-accent focus:outline-none aria-[invalid=true]:border-record";

/**
 * Sets the app password that locks notes. Shown the first time a note is
 * locked (or from Settings). There is no reset: the dialog says so plainly.
 */
export function SetPasswordDialog() {
  const dialog = useViewStore((state) => state.passwordDialog);
  const close = useViewStore((state) => state.closePasswordDialog);
  const setLockPassword = useNotesStore((state) => state.setLockPassword);
  const toggleLocked = useNotesStore((state) => state.toggleLocked);
  const ref = useRef<HTMLDialogElement>(null);
  const ids = { password: useId(), confirm: useId(), understood: useId(), title: useId() };
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordForm>({ resolver: zodResolver(setPasswordFormSchema) });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (dialog.open && !element.open) element.showModal();
    if (!dialog.open && element.open) element.close();
  }, [dialog.open]);

  const submit = handleSubmit(async ({ password }) => {
    const result = await setLockPassword(password);
    if (!result.success) {
      setError("password", { message: result.error });
      return;
    }
    if (dialog.lockAfter) await toggleLocked(dialog.lockAfter);
    reset();
    close();
  });

  return (
    <dialog
      ref={ref}
      aria-labelledby={ids.title}
      onClose={() => {
        reset();
        close();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/30"
    >
      <form onSubmit={(event) => void submit(event)} noValidate className="space-y-3 p-5">
        <h2 id={ids.title} className="text-[15px] font-bold">
          Set a password for locked notes
        </h2>
        <p className="text-[13px] leading-5 text-muted">
          Locked notes are encrypted with this password. If you forget it, nobody can open them, including you.
        </p>
        <div>
          <label htmlFor={ids.password} className="mb-1 block text-xs font-medium text-muted">
            Password
          </label>
          <input
            id={ids.password}
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.password ? true : undefined}
            {...register("password")}
            className={INPUT_CLASS}
          />
          {errors.password ? <p role="alert" className="mt-1 text-xs text-record">{errors.password.message}</p> : null}
        </div>
        <div>
          <label htmlFor={ids.confirm} className="mb-1 block text-xs font-medium text-muted">
            Type it again
          </label>
          <input
            id={ids.confirm}
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.confirm ? true : undefined}
            {...register("confirm")}
            className={INPUT_CLASS}
          />
          {errors.confirm ? <p role="alert" className="mt-1 text-xs text-record">{errors.confirm.message}</p> : null}
        </div>
        <div>
          <label htmlFor={ids.understood} className="flex cursor-pointer items-start gap-2 text-[13px] leading-5">
            <input id={ids.understood} type="checkbox" {...register("understood")} className="mt-1 accent-accent" />
            I understand a forgotten password can&apos;t be recovered.
          </label>
          {errors.understood ? (
            <p role="alert" className="mt-1 text-xs text-record">{errors.understood.message}</p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="h-9 cursor-pointer rounded-lg px-3 text-[13px] font-semibold text-ink hover:bg-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-9 cursor-pointer rounded-lg bg-accent px-4 text-[13px] font-semibold text-on-accent hover:opacity-90 disabled:cursor-progress disabled:opacity-60"
          >
            {dialog.lockAfter ? "Set password and lock" : "Set password"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
