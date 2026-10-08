"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full bg-divider",
        "transition-colors duration-[160ms] ease-signal",
        "data-[state=checked]:bg-accent",
        "outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block h-4 w-4 translate-x-0.5 rounded-full bg-white",
          "shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-[160ms] ease-signal",
          "data-[state=checked]:translate-x-[18px]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}
