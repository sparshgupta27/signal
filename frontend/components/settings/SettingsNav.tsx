"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, HelpCircle, Laptop2, LogOut, MessageSquare, Palette, Shield, User } from "lucide-react";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { cn } from "@/lib/cn";
import * as auth from "@/lib/mock/auth";

const SECTIONS = [
  { slug: "profile", label: "Profile", icon: User },
  { slug: "appearance", label: "Appearance", icon: Palette },
  { slug: "chats", label: "Chats", icon: MessageSquare },
  { slug: "notifications", label: "Notifications", icon: Bell },
  { slug: "privacy", label: "Privacy", icon: Shield },
  { slug: "linked-devices", label: "Linked devices", icon: Laptop2 },
  { slug: "help", label: "Help", icon: HelpCircle },
];

export function SettingsNav({ fullWidth = false }: { fullWidth?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col bg-sidebar",
        fullWidth ? "w-full" : "w-[340px] border-r border-divider"
      )}
    >
      <div className="flex h-14 items-center px-4">
        <h1 className="text-[20px] font-semibold text-primary">Settings</h1>
      </div>
      <nav className="flex-1 overflow-y-auto px-2">
        {SECTIONS.map((section) => {
          const href = `/settings/${section.slug}`;
          const active = pathname === href;
          const Icon = section.icon;
          return (
            <Link
              key={section.slug}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2.5 py-2.5 text-[14px] transition-colors duration-[120ms] ease-signal",
                active ? "bg-row-selected text-primary" : "text-secondary hover:bg-row-hover hover:text-primary"
              )}
            >
              <Icon size={18} strokeWidth={1.75} />
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-divider px-2 py-2">
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-[14px] text-danger transition-colors duration-[120ms] ease-signal hover:bg-danger/10"
        >
          <LogOut size={18} strokeWidth={1.75} />
          Log out
        </button>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Log out?"
        description="You can always sign back in with your phone number or username."
        confirmLabel="Log out"
        onConfirm={() => {
          auth.logout();
          router.replace("/welcome");
        }}
      />
    </div>
  );
}

export { SECTIONS as SETTINGS_SECTIONS };
