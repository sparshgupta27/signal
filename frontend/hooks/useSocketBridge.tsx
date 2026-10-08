"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Conversation } from "@/types";
import { CURRENT_USER_ID, getUser } from "@/lib/mock/data";
import { sortConversations } from "@/lib/mock/api";
import { mockSocket } from "@/lib/mock/socket";
import { useChatStore } from "@/store/chatStore";
import { usePresenceStore } from "@/store/presenceStore";
import { Avatar } from "@/components/ui/Avatar";
import { conversationsQueryKey } from "./useConversations";

/**
 * Mounted once near the app root. Wires mock-socket events into the
 * TanStack Query cache (chat list) and the Zustand presence store, and owns
 * the side effects that aren't any single screen's job: incoming-message
 * toasts and the unread count in the tab title.
 */
export function useSocketBridge() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    mockSocket.start();

    const patchConversation = (conversation: Conversation) => {
      queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (prev) => {
        if (!prev) return prev;
        const exists = prev.some((c) => c.id === conversation.id);
        const next = exists
          ? prev.map((c) => (c.id === conversation.id ? conversation : c))
          : [...prev, conversation];
        return sortConversations(next);
      });
    };

    const offConversationUpdated = mockSocket.on("conversation.updated", ({ conversation }) => {
      patchConversation(conversation);
      const totalUnread = (
        queryClient.getQueryData<Conversation[]>(conversationsQueryKey) ?? []
      ).reduce((sum, c) => sum + (c.isMuted ? 0 : c.unreadCount), 0);
      document.title = totalUnread > 0 ? `(${totalUnread}) Signal Clone` : "Signal Clone";
    });

    const offPresence = mockSocket.on("presence", (data) => {
      usePresenceStore.getState().setPresence(data.userId, {
        isOnline: data.isOnline,
        lastSeenAt: data.lastSeenAt,
      });
    });

    const offTyping = mockSocket.on("typing", (data) => {
      if (data.userId === CURRENT_USER_ID) return;
      usePresenceStore.getState().setTyping(data.conversationId, data.userId, data.isTyping);

      const key = `${data.conversationId}:${data.userId}`;
      const existing = typingTimers.current.get(key);
      if (existing) clearTimeout(existing);
      if (data.isTyping) {
        const timer = setTimeout(() => {
          usePresenceStore.getState().setTyping(data.conversationId, data.userId, false);
          typingTimers.current.delete(key);
        }, 6000);
        typingTimers.current.set(key, timer);
      } else {
        typingTimers.current.delete(key);
      }
    });

    const offMessageNew = mockSocket.on("message.new", ({ message }) => {
      if (message.senderId === CURRENT_USER_ID || message.type !== "text") return;
      const conversations = queryClient.getQueryData<Conversation[]>(conversationsQueryKey) ?? [];
      const conversation = conversations.find((c) => c.id === message.conversationId);
      if (!conversation || conversation.isMuted) return;
      if (useChatStore.getState().activeConversationId === message.conversationId) return;

      const sender = getUser(message.senderId);
      if (!sender) return;

      toast.custom(() => (
        <button
          type="button"
          onClick={() => router.push(`/chat/${message.conversationId}`)}
          className="flex w-80 items-start gap-3 rounded-lg border border-divider bg-elevated p-3 text-left shadow-menu"
        >
          <Avatar id={sender.id} name={sender.name} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold text-primary">
              {sender.name}
              {conversation.type === "group" ? ` in ${conversation.name}` : ""}
            </span>
            <span className="block truncate text-[13px] text-secondary">{message.body}</span>
          </span>
        </button>
      ));
    });

    const timers = typingTimers.current;
    return () => {
      // This hook only ever unmounts via RequireAuth gating AppShell away,
      // i.e. on logout — so stopping the simulation here is exactly "stop
      // pretending other people are using the app once nobody's logged in."
      mockSocket.stop();
      offConversationUpdated();
      offPresence();
      offTyping();
      offMessageNew();
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [queryClient, router]);
}
