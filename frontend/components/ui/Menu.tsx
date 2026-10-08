"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronRight } from "lucide-react";
import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export const Menu = DropdownMenuPrimitive.Root;
export const MenuTrigger = DropdownMenuPrimitive.Trigger;
export const MenuSub = DropdownMenuPrimitive.Sub;

export function MenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[200px] rounded-md bg-elevated p-1 shadow-menu outline-none",
          "data-[state=open]:animate-[content-in_160ms_var(--ease-signal)]",
          "data-[state=closed]:animate-[content-out_120ms_var(--ease-signal)]",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function MenuItem({
  className,
  danger,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
  danger?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex h-8 cursor-pointer select-none items-center gap-2 rounded-sm px-2",
        "text-[13.5px] outline-none transition-colors duration-[120ms]",
        "data-[highlighted]:bg-row-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        danger ? "text-danger" : "text-primary",
        className
      )}
      {...props}
    />
  );
}

export function MenuSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("my-1 h-px bg-divider", className)}
      {...props}
    />
  );
}

export function MenuLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary",
        className
      )}
      {...props}
    />
  );
}

export function MenuSubTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger>) {
  return (
    <DropdownMenuPrimitive.SubTrigger
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
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export function MenuSubContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        className={cn(
          "z-50 min-w-[160px] rounded-md bg-elevated p-1 shadow-menu outline-none",
          "data-[state=open]:animate-[content-in_160ms_var(--ease-signal)]",
          "data-[state=closed]:animate-[content-out_120ms_var(--ease-signal)]",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}
