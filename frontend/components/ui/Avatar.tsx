"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/cn";
import { avatarColorIndex, initialsFromName } from "@/lib/avatarColor";

interface AvatarProps {
  /** Stable id (user or group id) the colour is derived from. */
  id: string;
  name: string;
  src?: string | null;
  size?: number;
  online?: boolean;
  className?: string;
}

export function Avatar({
  id,
  name,
  src,
  size = 40,
  online,
  className,
}: AvatarProps) {
  const colorIndex = avatarColorIndex(id);
  const dotSize = Math.max(8, Math.round(size * 0.28));

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <AvatarPrimitive.Root
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full"
        style={{ backgroundColor: `var(--avatar-${colorIndex})` }}
      >
        {src ? (
          <AvatarPrimitive.Image
            src={src}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : null}
        <AvatarPrimitive.Fallback
          delayMs={src ? 300 : 0}
          className="select-none font-semibold text-on-accent"
          style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
        >
          {initialsFromName(name)}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {online ? (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-online"
          style={{
            width: dotSize,
            height: dotSize,
            boxShadow: "0 0 0 2px var(--bg-app)",
          }}
          aria-hidden
        />
      ) : null}
    </span>
  );
}
