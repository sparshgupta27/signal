"use client";

import { usePathname } from "next/navigation";
import { NavRail } from "@/components/layout/NavRail";
import { ListPane } from "@/components/layout/ListPane";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ShortcutsDialog } from "@/components/dialogs/ShortcutsDialog";
import { useSocketBridge } from "@/hooks/useSocketBridge";
import { useGlobalHotkeys } from "@/hooks/useGlobalHotkeys";
import { useIsMobile, useIsTablet } from "@/hooks/useMediaQuery";
import { useUiStore } from "@/store/uiStore";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  useSocketBridge();
  useGlobalHotkeys();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const shortcutsOpen = useUiStore((s) => s.shortcutsOpen);
  const closeShortcuts = useUiStore((s) => s.closeShortcuts);

  const showChatList = pathname === "/" || pathname.startsWith("/chat");
  const inChatThread = pathname.startsWith("/chat/") && pathname !== "/chat/new";
  const inSettingsSection = /^\/settings\/[^/]+$/.test(pathname);

  if (isMobile) {
    // Single pane at a time: the chat list fills the screen on its own
    // route ("/"), everything else (a thread, calls, stories, a settings
    // section) is `children` filling the screen instead. The tab bar drops
    // away inside a drill-in view (a thread or a settings section) so that
    // view gets the full screen, matching how Signal/WhatsApp behave.
    const showTabBar = !inChatThread && !inSettingsSection;
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-app">
        <main className="flex min-w-0 flex-1 overflow-hidden">
          {pathname === "/" ? <ListPane fullWidth /> : children}
        </main>
        {showTabBar && <MobileTabBar />}
        <ShortcutsDialog open={shortcutsOpen} onOpenChange={(open) => !open && closeShortcuts()} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app">
      <NavRail />
      {showChatList && <ListPane compact={isTablet} />}
      <main className="flex min-w-0 flex-1">{children}</main>
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={(open) => !open && closeShortcuts()} />
    </div>
  );
}
