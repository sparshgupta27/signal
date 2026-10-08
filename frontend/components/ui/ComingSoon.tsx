import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

interface ComingSoonProps {
  icon?: LucideIcon;
  title: string;
  className?: string;
}

export function ComingSoon({ icon: Icon = Sparkles, title, className }: ComingSoonProps) {
  return (
    <div className={`flex h-full flex-col items-center justify-center gap-3 bg-app px-6 text-center ${className ?? ""}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sidebar text-secondary">
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <h2 className="text-[16px] font-semibold text-primary">{title}</h2>
      <p className="text-[13.5px] text-secondary">This feature is coming soon.</p>
    </div>
  );
}
