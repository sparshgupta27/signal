"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Tooltip } from "./Tooltip";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required for every icon-only control — doubles as aria-label and tooltip text. */
  label: string;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

const sizeClasses: Record<NonNullable<IconButtonProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      label,
      active,
      size = "md",
      showTooltip = true,
      children,
      ...props
    },
    ref
  ) => {
    const button = (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-secondary",
          "transition-colors duration-[120ms] ease-signal hover:bg-row-hover hover:text-primary",
          "active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
          "outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
          active && "bg-row-selected text-primary",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );

    if (!showTooltip) return button;
    return <Tooltip content={label}>{button}</Tooltip>;
  }
);
IconButton.displayName = "IconButton";
