"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: [mod, "K"], label: "Search chats and contacts" },
  { keys: [mod, "N"], label: "Start a new chat" },
  { keys: [mod, "Shift", "N"], label: "Start a new group" },
  { keys: [mod, ","], label: "Open settings" },
  { keys: ["Alt", "↑"], label: "Previous chat" },
  { keys: ["Alt", "↓"], label: "Next chat" },
  { keys: ["Esc"], label: "Close panel, dialog, or clear search" },
  { keys: ["?"], label: "Show this list" },
];

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={380}>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <div className="mt-3 divide-y divide-divider">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between py-2.5">
              <span className="text-[13.5px] text-primary">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((key) => (
                  <kbd
                    key={key}
                    className="min-w-[22px] rounded-md border border-divider bg-row-hover px-1.5 py-1 text-center text-[12px] font-medium text-secondary"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
