import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";
import type { MessageStatus } from "@/types";
import { cn } from "@/lib/cn";

export function StatusIcon({ status, className }: { status: MessageStatus; className?: string }) {
  const common = cn("shrink-0", className);
  let icon = null;
  let label = "";

  switch (status) {
    case "sending":
      icon = <Clock size={13} className={cn(common, "opacity-75")} />;
      label = "Sending…";
      break;
    case "sent":
      icon = <Check size={14} className={cn(common, "opacity-80")} />;
      label = "Sent";
      break;
    case "delivered":
      icon = <CheckCheck size={14} className={cn(common, "opacity-80")} />;
      label = "Delivered";
      break;
    case "read":
      // Vibrant sky-blue double checkmark (the classic "blue ticks" receipt)
      icon = <CheckCheck size={14} className={cn(common, "text-[#38bdf8] drop-shadow-sm")} />;
      label = "Read";
      break;
    case "failed":
      icon = <AlertCircle size={14} className={cn(common, "text-danger")} />;
      label = "Failed";
      break;
    default:
      return null;
  }

  return (
    <span title={label} aria-label={label} className="inline-flex items-center">
      {icon}
    </span>
  );
}
