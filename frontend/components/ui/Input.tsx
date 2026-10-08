import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Fully rounded like Signal's search field. Defaults to true. */
  pill?: boolean;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      leadingIcon,
      trailingIcon,
      pill = true,
      ...props
    },
    ref
  ) => {
    return (
      <div
        className={cn(
          "flex h-9 items-center gap-2 bg-input px-3 text-[14px] text-primary",
          "transition-shadow duration-[120ms] ease-signal",
          "focus-within:ring-2 focus-within:ring-accent/40",
          pill ? "rounded-full" : "rounded-md",
          containerClassName
        )}
      >
        {leadingIcon ? (
          <span className="shrink-0 text-secondary">{leadingIcon}</span>
        ) : null}
        <input
          ref={ref}
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none placeholder:text-secondary",
            className
          )}
          {...props}
        />
        {trailingIcon ? (
          <span className="shrink-0 text-secondary">{trailingIcon}</span>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
