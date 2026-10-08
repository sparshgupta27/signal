import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary:
    "bg-transparent text-primary border border-divider hover:bg-row-hover",
  ghost: "bg-transparent text-secondary hover:bg-row-hover hover:text-primary",
  danger: "bg-transparent text-danger hover:bg-danger/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-[14px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium",
          "transition-colors duration-[120ms] ease-signal active:scale-[0.97]",
          "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
          "outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
