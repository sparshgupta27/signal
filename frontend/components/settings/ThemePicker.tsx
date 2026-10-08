"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/cn";

const OPTIONS = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "system" as const, label: "System", icon: Monitor },
];

export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-3">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-lg border-2 px-4 py-4 transition-colors duration-[120ms] ease-signal",
              active ? "border-accent bg-accent/5" : "border-divider hover:bg-row-hover"
            )}
          >
            {active && (
              <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-on-accent">
                <Check size={11} />
              </span>
            )}
            <Icon size={22} className={active ? "text-accent" : "text-secondary"} />
            <span className="text-[13px] font-medium text-primary">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
