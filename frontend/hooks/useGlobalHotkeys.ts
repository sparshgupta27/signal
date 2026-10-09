import { usePathname, useRouter } from "next/navigation";
import { useHotkeys } from "./useHotkeys";
import { useConversations } from "./useConversations";
import { useChatStore } from "@/store/chatStore";
import { useUiStore } from "@/store/uiStore";

function hasOpenOverlay(): boolean {
  return !!document.querySelector('[role="dialog"], [role="menu"], [data-radix-popper-content-wrapper]');
}

/** Mounted once near the app root. The actual shortcut table (see the spec's shortcuts dialog) — matched against window keydowns by useHotkeys. */
export function useGlobalHotkeys() {
  const router = useRouter();
  const pathname = usePathname();
  const { conversations } = useConversations();
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const openNewChat = useUiStore((s) => s.openNewChat);
  const requestSearchFocus = useUiStore((s) => s.requestSearchFocus);
  const openShortcuts = useUiStore((s) => s.openShortcuts);
  const detailsPanelOpen = useUiStore((s) => s.detailsPanelOpen);
  const closeDetailsPanel = useUiStore((s) => s.closeDetailsPanel);

  const onChatListRoute = pathname === "/" || pathname.startsWith("/chat");
  const goToChatListThen = (fn: () => void) => {
    if (!onChatListRoute) router.push("/");
    fn();
  };

  const stepChat = (direction: 1 | -1) => {
    if (conversations.length === 0) return;
    const index = conversations.findIndex((c) => c.id === activeConversationId);
    const next =
      index === -1
        ? conversations[direction === 1 ? 0 : conversations.length - 1]!
        : conversations[Math.min(conversations.length - 1, Math.max(0, index + direction))]!;
    router.push(`/chat/${next.id}`);
  };

  useHotkeys([
    { combo: "mod+k", allowInInputs: true, handler: () => goToChatListThen(requestSearchFocus) },
    { combo: "mod+n", allowInInputs: true, handler: () => goToChatListThen(() => openNewChat("browse")) },
    {
      combo: "mod+shift+n",
      allowInInputs: true,
      handler: () => goToChatListThen(() => openNewChat("new-group")),
    },
    { combo: "mod+,", allowInInputs: true, handler: () => router.push("/settings") },
    { combo: "alt+arrowdown", handler: () => stepChat(1) },
    { combo: "alt+arrowup", handler: () => stepChat(-1) },
    {
      combo: "escape",
      allowInInputs: true,
      handler: () => {
        if (detailsPanelOpen && !hasOpenOverlay()) closeDetailsPanel();
      },
    },
    { combo: "?", handler: () => openShortcuts() },
  ]);
}
