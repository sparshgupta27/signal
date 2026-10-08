"use client";

import { usePathname } from "next/navigation";
import { NavRail } from "@/components/layout/NavRail";
import { ListPane } from "@/components/layout/ListPane";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useSocketBridge } from "@/hooks/useSocketBridge";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  useSocketBridge();
  const pathname = usePathname();
  const showChatList = pathname === "/" || pathname.startsWith("/chat");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app">
      <NavRail />
      {showChatList && <ListPane />}
      <main className="flex min-w-0 flex-1">{children}</main>
    </div>
  );
}
