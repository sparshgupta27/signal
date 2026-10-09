"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, Phone, Settings, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { cn } from "@/lib/cn";
import { clearSession } from "@/lib/session";
import { useConversations } from "@/hooks/useConversations";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useSession } from "@/hooks/useSession";
import { useUiStore } from "@/store/uiStore";

const NAV_ITEMS = [
  { href: "/", label: "Chats", icon: MessageCircle, match: (p: string) => p === "/" || p.startsWith("/chat") },
  { href: "/calls", label: "Calls", icon: Phone, match: (p: string) => p.startsWith("/calls") },
  { href: "/stories", label: "Stories", icon: Sparkles, match: (p: string) => p.startsWith("/stories") },
];

export function NavRail() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const profile = useMyProfile();
  const { conversations } = useConversations();
  const totalUnread = conversations.reduce((sum, c) => sum + (c.isMuted ? 0 : c.unreadCount), 0);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const openShortcuts = useUiStore((s) => s.openShortcuts);

  return (
    <nav className="flex w-[68px] shrink-0 flex-col items-center justify-between border-r border-divider bg-sidebar py-3">
      <div className="flex flex-col items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Tooltip key={item.href} content={item.label} side="right">
              <Link
                href={item.href}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-[10px] text-secondary",
                  "transition-colors duration-[120ms] ease-signal hover:bg-row-hover hover:text-primary",
                  active && "bg-row-selected text-primary"
                )}
              >
                <Icon size={22} strokeWidth={1.75} />
                {item.href === "/" && totalUnread > 0 ? (
                  <span className="absolute right-1.5 top-1.5">
                    <Badge dot />
                  </span>
                ) : null}
              </Link>
            </Tooltip>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Tooltip content="Settings" side="right">
          <Link
            href="/settings"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-[10px] text-secondary",
              "transition-colors duration-[120ms] ease-signal hover:bg-row-hover hover:text-primary",
              pathname.startsWith("/settings") && "bg-row-selected text-primary"
            )}
          >
            <Settings size={22} strokeWidth={1.75} />
          </Link>
        </Tooltip>

        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              className="rounded-full outline-none transition-transform duration-[120ms] ease-signal active:scale-95 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              aria-label="Profile menu"
            >
              <Avatar id={session?.user.id ?? "me"} name={profile.name} src={profile.avatarUrl} size={32} />
            </button>
          </MenuTrigger>
          <MenuContent side="right" align="end">
            <MenuLabel>{profile.name}</MenuLabel>
            <div className="px-2 text-[12.5px] text-secondary">{session?.user.phone}</div>
            {profile.about && (
              <div className="px-2 pb-1 text-[12.5px] text-secondary">{profile.about}</div>
            )}
            <MenuSeparator />
            <MenuItem onSelect={() => router.push("/settings/profile")}>Edit profile</MenuItem>
            <MenuItem onSelect={() => router.push("/settings")}>Settings</MenuItem>
            <MenuItem onSelect={openShortcuts}>Keyboard shortcuts</MenuItem>
            <MenuSeparator />
            <MenuItem danger onSelect={() => setLogoutOpen(true)}>
              Log out
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Log out?"
        description="You can always sign back in with your phone number or username."
        confirmLabel="Log out"
        onConfirm={() => {
          clearSession();
          router.replace("/welcome");
        }}
      />
    </nav>
  );
}
