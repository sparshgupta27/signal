"use client";

import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { useUiStore } from "@/store/uiStore";

export default function ChatsIndexPage() {
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const closeDetailsPanel = useUiStore((s) => s.closeDetailsPanel);

  useEffect(() => {
    setActiveConversationId(null);
    closeDetailsPanel();
  }, [setActiveConversationId, closeDetailsPanel]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-app px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sidebar text-accent">
        <MessageCircle size={32} strokeWidth={1.5} />
      </div>
      <h2 className="text-[18px] font-semibold text-primary">Signal Clone</h2>
      <p className="max-w-xs text-[13.5px] text-secondary">
        Select a chat to start messaging, or press the pencil icon to start a
        new one.
      </p>
    </div>
  );
}
