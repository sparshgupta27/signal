"use client";

import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { ChevronRight } from "lucide-react";
import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuSub = ContextMenuPrimitive.Sub;

export function ContextMenuContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        className={cn(
          "z-50 min-w-[200px] rounded-md bg-elevated p-1 shadow-menu outline-none",
          "data-[state=open]:animate-[content-in_160ms_var(--ease-signal)]",
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuItem({
  className,
  danger,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
  danger?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(
        "flex h-8 cursor-pointer select-none items-center gap-2 rounded-sm px-2",
        "text-[13.5px] outline-none transition-colors duration-[120ms]",
        "data-[highlighted]:bg-row-hover",
        danger ? "text-danger" : "text-primary",
        className
      )}
      {...props}
    />
  );
}

export function ContextMenuSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      className={cn("my-1 h-px bg-divider", className)}
      {...props}
    />
  );
}

export function ContextMenuSubTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger>) {
  return (
    <ContextMenuPrimitive.SubTrigger
      className={cn(
        "flex h-8 cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-2",
        "text-[13.5px] text-primary outline-none transition-colors duration-[120ms]",
        "data-[highlighted]:bg-row-hover data-[state=open]:bg-row-hover",
        className
      )}
      {...props}
    >
      <span className="flex items-center gap-2">{children}</span>
      <ChevronRight size={14} className="text-secondary" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

export function ContextMenuSubContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent
        className={cn(
          "z-50 min-w-[160px] rounded-md bg-elevated p-1 shadow-menu outline-none",
          "data-[state=open]:animate-[content-in_160ms_var(--ease-signal)]",
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}
