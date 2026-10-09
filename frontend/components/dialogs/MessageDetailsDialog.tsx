"use client";

import { useEffect, useState } from "react";
import { Check, CheckCheck, Loader2 } from "lucide-react";
import type { Message, MessageReceipt } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { getUser } from "@/lib/users";
import { formatBubbleTime } from "@/lib/format";
import * as api from "@/lib/api";

interface MessageDetailsDialogProps {
  message: Message | null;
  onOpenChange: (open: boolean) => void;
}

export function MessageDetailsDialog({ message, onOpenChange }: MessageDetailsDialogProps) {
  const [receipts, setReceipts] = useState<MessageReceipt[] | null>(null);

  useEffect(() => {
    if (!message) return;
    let cancelled = false;
    // Reset-then-fetch on the message changing — the fetch itself can't run
    // synchronously, so the "clear stale data" half has to happen here too.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReceipts(null);
    api.getMessageReceipts(message.id).then((res) => {
      if (!cancelled) setReceipts(res.receipts);
    });
    return () => {
      cancelled = true;
    };
  }, [message]);

  return (
    <Dialog open={!!message} onOpenChange={onOpenChange}>
      <DialogContent width={360}>
        <DialogTitle>Message details</DialogTitle>
        {message && (
          <div className="mt-1 mb-3 rounded-md bg-elevated px-3 py-2 text-[13.5px] text-secondary">
            <p className="whitespace-pre-wrap break-words text-primary">
              {message.body || "(no text)"}
            </p>
            <p className="mt-1 text-[11.5px]">Sent {formatBubbleTime(message.createdAt)}</p>
          </div>
        )}

        {receipts === null ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin text-secondary" />
          </div>
        ) : receipts.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-secondary">No other recipients.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {receipts.map((r) => {
              const user = getUser(r.userId);
              const label = r.readAt ? "Read" : r.deliveredAt ? "Delivered" : "Sent";
              const at = r.readAt ?? r.deliveredAt;
              return (
                <div key={r.userId} className="flex items-center gap-2.5">
                  <Avatar id={r.userId} name={user?.name ?? "Unknown"} src={user?.avatarUrl} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-primary">
                      {user?.name ?? "Unknown"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] text-secondary">
                    {r.readAt ? (
                      <CheckCheck size={14} className="text-accent" />
                    ) : r.deliveredAt ? (
                      <CheckCheck size={14} />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>
                      {label}
                      {at ? ` ${formatBubbleTime(at)}` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
