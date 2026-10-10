"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { type ComponentPropsWithoutRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

interface DialogContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  width?: number;
}

export function DialogContent({
  className,
  children,
  width = 440,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]",
          "data-[state=open]:animate-[overlay-in_160ms_ease-out]",
          "data-[state=closed]:animate-[overlay-out_160ms_ease-out]"
        )}
      />
      <DialogPrimitive.Content
        // The inline width beat the w-[calc(100vw-32px)] class, so on a
        // phone narrower than `width` every dialog spilled off both sides.
        // maxWidth inline wins over that inline width, keeping a 16px gutter.
        style={{ width, maxWidth: "calc(100vw - 32px)" }}
        className={cn(
          // dvh, not vh: on phones vh includes the area behind the browser's
          // address bar, so 85vh could still run off the bottom.
          "fixed left-1/2 top-1/2 z-50 max-h-[85dvh] -translate-x-1/2 -translate-y-1/2",
          "overflow-y-auto rounded-lg bg-elevated p-6 shadow-menu outline-none",
          "data-[state=open]:animate-[content-in_160ms_var(--ease-signal)]",
          "data-[state=closed]:animate-[content-out_120ms_var(--ease-signal)]",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-[17px] font-semibold text-primary", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1.5 text-[13.5px] text-secondary", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />
  );
}
