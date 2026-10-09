"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/Dialog";
import { formatDisappearingDuration } from "@/lib/format";

// Signal's real duration set (Off + the five fixed options it offers).
const OPTIONS = [0, 30, 300, 3600, 86400, 604800];

interface DisappearingMessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSeconds: number | null | undefined;
  onConfirm: (seconds: number | null) => void;
}

export function DisappearingMessagesDialog({
  open,
  onOpenChange,
  currentSeconds,
  onConfirm,
}: DisappearingMessagesDialogProps) {
  const [selected, setSelected] = useState(currentSeconds ?? 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setSelected(currentSeconds ?? 0);
        onOpenChange(next);
      }}
    >
      <DialogContent width={360}>
        <DialogTitle>Disappearing messages</DialogTitle>
        <DialogDescription>
          New messages sent after this is turned on will disappear once the timer runs out.
          This applies to everyone in the chat.
        </DialogDescription>

        <div className="mt-3 divide-y divide-divider rounded-lg border border-divider">
          {OPTIONS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              onClick={() => setSelected(seconds)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[13.5px] text-primary first:rounded-t-lg last:rounded-b-lg hover:bg-row-hover"
            >
              {formatDisappearingDuration(seconds)}
              {selected === seconds && <Check size={16} className="text-accent" />}
            </button>
          ))}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={() => onConfirm(selected === 0 ? null : selected)}>Set</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
