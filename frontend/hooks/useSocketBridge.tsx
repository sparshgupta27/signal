"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Conversation } from "@/types";
import * as api from "@/lib/api";
import { getCurrentUserId } from "@/lib/session";
import { getUser, getUsersVersion, primeUser, primeUsers, subscribeUsers } from "@/lib/users";
import { sortConversations } from "@/lib/api";
import { wsClient } from "@/lib/ws";
import { useChatStore } from "@/store/chatStore";
import { usePresenceStore } from "@/store/presenceStore";
import { Avatar } from "@/components/ui/Avatar";
import { archivedConversationsQueryKey, conversationsQueryKey } from "./useConversations";

/**
 * Mounted once near the app root. Wires the WebSocket connection into the
 * TanStack Query cache (chat list) and the Zustand presence store, and owns
 * the side effects that aren't any single screen's job: incoming-message
 * toasts and the unread count in the tab title.
 */
export function useSocketBridge() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // getUser() is a plain synchronous cache read, not reactive on its own —
  // components calling it (chat list rows, message bubbles, group/contact
  // details) render once with whatever's cached *at that instant*. The
  // directory priming below is async, so without this subscription anyone
  // not yet cached renders as "Unknown" permanently: nothing ever tells
  // those components to re-render once the real name arrives. Subscribing
  // here — in the hook mounted once at the root of the authenticated app
  // tree (app/(app)/layout.tsx) — re-renders that whole tree on every
  // cache update instead of wiring a subscription into a dozen call sites.
  useSyncExternalStore(subscribeUsers, getUsersVersion, () => 0);

  useEffect(() => {
    wsClient.start();

    // Primes the whole user directory once per session, so every seeded
    // conversation's members/senders resolve immediately instead of one at
    // a time via the on-demand cache-miss fetch below.
    Promise.all([api.getMe(), api.listAllUsers()])
      .then(([me, others]) => primeUsers([me, ...others]))
      .catch(() => {});

    // conversation.updated fires for plenty of reasons that have nothing to
    // do with archiving (a new message, pin/mute, a renamed group) — for an
    // *archived* conversation, every one of those was patching it straight
    // back into the main list regardless, since this never checked
    // isArchived at all. That's "archiving a chat, then it reappears the
    // moment anyone sends a message in it." Route into whichever cache
    // actually matches the conversation's current archived state, and keep
    // the other one from holding a stale copy.
    const patchConversation = (conversation: Conversation) => {
      const [targetKey, staleKey] = conversation.isArchived
        ? [archivedConversationsQueryKey, conversationsQueryKey]
        : [conversationsQueryKey, archivedConversationsQueryKey];

      queryClient.setQueryData<Conversation[]>(targetKey, (prev) => {
        if (!prev) return prev;
        const exists = prev.some((c) => c.id === conversation.id);
        const next = exists
          ? prev.map((c) => (c.id === conversation.id ? conversation : c))
          : [...prev, conversation];
        return sortConversations(next);
      });
      queryClient.setQueryData<Conversation[]>(staleKey, (prev) =>
        prev ? prev.filter((c) => c.id !== conversation.id) : prev
      );
    };

    const offConversationUpdated = wsClient.on("conversation.updated", ({ conversation }) => {
      patchConversation(conversation);
      const totalUnread = (
        queryClient.getQueryData<Conversation[]>(conversationsQueryKey) ?? []
      ).reduce((sum, c) => sum + (c.isMuted ? 0 : c.unreadCount), 0);
      document.title = totalUnread > 0 ? `(${totalUnread}) Signal Clone` : "Signal Clone";
    });

    const offPresence = wsClient.on("presence", (data) => {
      usePresenceStore.getState().setPresence(data.userId, {
        isOnline: data.isOnline,
        lastSeenAt: data.lastSeenAt,
      });
    });

    const offTyping = wsClient.on("typing", (data) => {
      if (data.userId === getCurrentUserId()) return;
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

    const offMessageNew = wsClient.on("message.new", ({ message }) => {
      if (message.senderId === getCurrentUserId() || message.type !== "text") return;
      const conversations = queryClient.getQueryData<Conversation[]>(conversationsQueryKey) ?? [];
      const conversation = conversations.find((c) => c.id === message.conversationId);
      if (!conversation || conversation.isMuted) return;
      if (useChatStore.getState().activeConversationId === message.conversationId) return;

      const sender = getUser(message.senderId);
      if (!sender) {
        // Cache miss — someone not seen before (a new DM, a new group
        // member). Can't render this toast without their name/avatar, but
        // prime the cache in the background so the *next* event about them
        // resolves immediately.
        if (message.senderId) api.getUserById(message.senderId).then(primeUser).catch(() => {});
        return;
      }

      toast.custom(() => (
        <button
          type="button"
          onClick={() => router.push(`/chat/${message.conversationId}`)}
          className="flex w-80 items-start gap-3 rounded-lg border border-divider bg-elevated p-3 text-left shadow-menu"
        >
          <Avatar id={sender.id} name={sender.name} src={sender.avatarUrl} size={36} />
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
      // i.e. on logout — so disconnecting here is exactly "no socket once
      // nobody's logged in."
      wsClient.stop();
      offConversationUpdated();
      offPresence();
      offTyping();
      offMessageNew();
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [queryClient, router]);
}
