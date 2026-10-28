"use client";

import type { ComponentType } from "react";
import { Monitor01, Moon01, Sun } from "@untitledui/icons";
import { useThemeStore } from "@/features/notes/stores/theme-store";
import type { ThemePreference } from "@/features/notes/stores/theme-store";
import { cx } from "@/utils/cx";

const OPTIONS: { value: ThemePreference; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { value: "system", label: "System", icon: Monitor01 },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon01 },
];

/** Light, dark, or follow the system: a three-way segmented control. */
export function ThemeSwitch() {
  const preference = useThemeStore((state) => state.preference);
  const choose = useThemeStore((state) => state.choose);

  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium text-muted">Appearance</legend>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-hover p-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cx(
              "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
              preference === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={preference === value}
              onChange={() => choose(value)}
              className="sr-only"
            />
            <Icon className="size-3.5" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
