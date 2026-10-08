import { cn } from "@/lib/cn";

interface BadgeProps {
  count?: number;
  variant?: "accent" | "muted";
  dot?: boolean;
  className?: string;
}

export function Badge({ count, variant = "accent", dot, className }: BadgeProps) {
  if (dot) {
    return (
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          variant === "accent" ? "bg-accent" : "bg-secondary",
          className
        )}
      />
    );
  }

  if (!count) return null;

  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5",
        "text-[12px] font-semibold leading-none",
        variant === "accent"
          ? "bg-accent text-on-accent"
          : "bg-divider text-secondary",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
