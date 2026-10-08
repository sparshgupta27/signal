import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";
import type { MessageStatus } from "@/types";
import { cn } from "@/lib/cn";

export function StatusIcon({ status, className }: { status: MessageStatus; className?: string }) {
  const common = cn("shrink-0", className);
  switch (status) {
    case "sending":
      return <Clock size={14} className={common} />;
    case "sent":
      return <Check size={14} className={common} />;
    case "delivered":
      return <CheckCheck size={14} className={common} />;
    case "read":
      // Filled (not colour) is how Signal distinguishes read from delivered —
      // outgoing bubbles are already accent-blue, so a tint would just vanish.
      return <CheckCheck size={14} fill="currentColor" className={common} />;
    case "failed":
      return <AlertCircle size={14} className={cn(common, "text-danger")} />;
    default:
      return null;
  }
}
