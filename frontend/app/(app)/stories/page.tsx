import { Sparkles } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function StoriesPage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-divider px-4">
        <h1 className="text-[20px] font-semibold text-primary">Stories</h1>
      </div>
      <ComingSoon icon={Sparkles} title="No stories yet" className="flex-1" />
    </div>
  );
}
