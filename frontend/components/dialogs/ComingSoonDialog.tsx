"use client";

import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";

interface ComingSoonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}

export function ComingSoonDialog({ open, onOpenChange, title }: ComingSoonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={360}>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sidebar text-secondary">
            <Sparkles size={28} strokeWidth={1.5} />
          </div>
          <h2 className="text-[16px] font-semibold text-primary">{title}</h2>
          <p className="text-[13.5px] text-secondary">This feature is coming soon.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
