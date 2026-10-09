"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { getCurrentUserId } from "@/lib/session";
import { getUser } from "@/lib/users";
import { computeSafetyNumber, groupDigits } from "@/lib/safetyNumber";

interface SafetyNumberDialogProps {
  otherUserId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SafetyNumberDialog({ otherUserId, open, onOpenChange }: SafetyNumberDialogProps) {
  const [digits, setDigits] = useState<string | null>(null);
  const me = getUser(getCurrentUserId());
  const other = otherUserId ? getUser(otherUserId) : undefined;

  useEffect(() => {
    if (!open || !me?.publicKey || !other?.publicKey) return;
    let cancelled = false;
    computeSafetyNumber(me.publicKey, other.publicKey).then((d) => {
      if (!cancelled) setDigits(d);
    });
    return () => {
      cancelled = true;
    };
    // publicKey is stable once assigned, so the user ids are what actually
    // identify "which pair this number is for".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, me?.id, other?.id]);

  const groups = digits ? groupDigits(digits) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={380}>
        <DialogTitle>Safety number</DialogTitle>
        <div className="mt-1 flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <ShieldCheck size={26} strokeWidth={1.75} />
          </div>
          {other ? (
            <p className="text-[13px] text-secondary">
              Compare this number with {other.name.split(" ")[0]} to verify your conversation is
              encrypted end-to-end. It&apos;s unique to the two of you.
            </p>
          ) : null}

          {groups.length > 0 ? (
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 rounded-lg bg-elevated px-5 py-4 font-mono text-[14.5px] tracking-wide text-primary">
              {groups.map((g, i) => (
                <span key={i}>{g}</span>
              ))}
            </div>
          ) : (
            <div className="py-6 text-[13px] text-secondary">Generating…</div>
          )}

          <p className="text-[11.5px] text-secondary">
            Mocked for this demo — derived from each account&apos;s placeholder key, not a real
            key exchange.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
