"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Phone, Settings, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { useConversations } from "@/hooks/useConversations";

const TABS = [
  { href: "/", label: "Chats", icon: MessageCircle, match: (p: string) => p === "/" || p.startsWith("/chat") },
  { href: "/calls", label: "Calls", icon: Phone, match: (p: string) => p.startsWith("/calls") },
  { href: "/stories", label: "Stories", icon: Sparkles, match: (p: string) => p.startsWith("/stories") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/settings") },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const { conversations } = useConversations();
  const totalUnread = conversations.reduce((sum, c) => sum + (c.isMuted ? 0 : c.unreadCount), 0);

  return (
    <nav className="flex shrink-0 items-stretch border-t border-divider bg-sidebar pb-[env(safe-area-inset-bottom)]">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-secondary",
              active && "text-accent"
            )}
          >
            <Icon size={22} strokeWidth={1.75} />
            <span className="text-[11px] font-medium">{tab.label}</span>
            {tab.href === "/" && totalUnread > 0 && (
              <span className="absolute right-[26%] top-1">
                <Badge dot />
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
