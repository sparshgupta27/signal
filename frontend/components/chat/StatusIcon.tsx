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
      // Lucide's checkmarks are open stroke paths — filling them (rather
      // than just coloring) renders as a solid blob, not a crisp check.
      // Distinguishing read from delivered is the caller's job (it controls
      // the dimmed vs. full-strength text color via className).
      return <CheckCheck size={14} className={common} />;
    case "failed":
      return <AlertCircle size={14} className={cn(common, "text-danger")} />;
    default:
      return null;
  }
}
