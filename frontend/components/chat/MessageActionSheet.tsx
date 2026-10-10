"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Copy, CornerUpLeft, Forward, Info, Pencil, Trash2 } from "lucide-react";
import type { Message } from "@/types";
import { cn } from "@/lib/cn";
import { getCurrentUserId } from "@/lib/session";

export const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

// Long enough for the sheet's close animation to finish before another
// dialog (forward, details, confirm delete) opens on top of where it was.
const AFTER_CLOSE_MS = 160;

interface MessageActionSheetProps {
  message: Message;
  isOwn: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onForward: () => void;
  onEdit: () => void;
  onDetails: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
}

/** Touch replacement for the desktop hover toolbar, opened by long-press. */
export function MessageActionSheet({
  message,
  isOwn,
  open,
  onOpenChange,
  onReact,
  onReply,
  onCopy,
  onForward,
  onEdit,
  onDetails,
  onDeleteForMe,
  onDeleteForEveryone,
}: MessageActionSheetProps) {
  const myReaction = message.reactions.find((r) => r.userId === getCurrentUserId())?.emoji;

  const close = () => onOpenChange(false);
  const now = (action: () => void) => () => {
    close();
    action();
  };
  const afterClose = (action: () => void) => () => {
    close();
    setTimeout(action, AFTER_CLOSE_MS);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-black/40",
            "data-[state=open]:animate-[overlay-in_160ms_ease-out]",
            "data-[state=closed]:animate-[overlay-out_160ms_ease-out]"
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // Reply and Edit focus a text field; restoring focus on close
          // would immediately take it away again.
          onCloseAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-elevated px-2 pt-2 shadow-menu outline-none",
            "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
            "data-[state=open]:animate-[sheet-in_200ms_var(--ease-signal)]",
            "data-[state=closed]:animate-[sheet-out_160ms_var(--ease-signal)]"
          )}
        >
          <DialogPrimitive.Title className="sr-only">Message actions</DialogPrimitive.Title>
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-divider" />

          <div className="mb-1 flex items-center justify-around px-2 py-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`React with ${emoji}`}
                onClick={now(() => onReact(emoji))}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full text-[24px] active:scale-90",
                  myReaction === emoji ? "bg-accent/20" : "bg-row-hover"
                )}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex flex-col">
            <Action icon={<CornerUpLeft size={20} />} label="Reply" onClick={now(onReply)} />
            {message.body && <Action icon={<Copy size={20} />} label="Copy text" onClick={now(onCopy)} />}
            <Action icon={<Forward size={20} />} label="Forward" onClick={afterClose(onForward)} />
            {isOwn && message.type === "text" && (
              <Action icon={<Pencil size={20} />} label="Edit" onClick={now(onEdit)} />
            )}
            {isOwn && <Action icon={<Info size={20} />} label="Message details" onClick={afterClose(onDetails)} />}
            <Action icon={<Trash2 size={20} />} label="Delete for me" danger onClick={afterClose(onDeleteForMe)} />
            {isOwn && (
              <Action
                icon={<Trash2 size={20} />}
                label="Delete for everyone"
                danger
                onClick={afterClose(onDeleteForEveryone)}
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Action({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-lg px-4 py-3.5 text-left text-[15px] active:bg-row-hover",
        danger ? "text-danger" : "text-primary"
      )}
    >
      <span className={danger ? "text-danger" : "text-secondary"}>{icon}</span>
      {label}
    </button>
  );
}
