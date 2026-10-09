import { useCallback, useEffect, useState } from "react";
import type { Message } from "@/types";
import * as api from "@/lib/api";
import { getCurrentUserId } from "@/lib/session";
import { wsClient } from "@/lib/ws";

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Reset-then-fetch on id change is the standard data-fetching effect
    // shape — these setState calls kick off the load, they don't mirror
    // something already derivable from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setMessages([]);
    api.getMessages(conversationId).then((res) => {
      if (cancelled) return;
      setMessages(res.messages);
      setHasMore(res.hasMore);
      setIsLoading(false);
      // Acks anything that arrived while this client was offline/elsewhere —
      // the server already auto-delivers to anyone online when a message is
      // sent, so this mostly covers the gap, but it's a cheap, idempotent
      // call either way.
      const myId = getCurrentUserId();
      const undelivered = res.messages
        .filter((m) => m.senderId && m.senderId !== myId && m.status !== "read")
        .map((m) => m.id);
      wsClient.markDelivered(undelivered);
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    const offNew = wsClient.on("message.new", ({ message }) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => {
        // My own optimistic echo (same clientId) gets replaced by the
        // authoritative server copy; anything else is a genuinely new
        // message to append, de-duped by id as a safety net.
        const idx = prev.findIndex((m) => m.clientId === message.clientId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = message;
          return next;
        }
        return prev.some((m) => m.id === message.id) ? prev : [...prev, message];
      });
      if (message.senderId && message.senderId !== getCurrentUserId()) {
        wsClient.markDelivered([message.id]);
      }
    });
    const offStatus = wsClient.on("message.status", (data) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, status: data.status } : m))
      );
    });
    const offDeleted = wsClient.on("message.deleted", (data) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, deletedAt: data.deletedAt, body: "", attachment: null }
            : m
        )
      );
    });
    const offReaction = wsClient.on("reaction.updated", (data) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    });
    return () => {
      offNew();
      offStatus();
      offDeleted();
      offReaction();
    };
  }, [conversationId]);

  const loadOlder = useCallback(async () => {
    if (isLoadingOlder || !hasMore || messages.length === 0) return;
    setIsLoadingOlder(true);
    const oldest = messages[0]!;
    const res = await api.getMessages(conversationId, { before: oldest.id });
    setMessages((prev) => [...res.messages, ...prev]);
    setHasMore(res.hasMore);
    setIsLoadingOlder(false);
  }, [conversationId, hasMore, isLoadingOlder, messages]);

  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      const message = messages.find((m) => m.id === messageId);
      const myId = getCurrentUserId();
      const mine = message?.reactions.find((r) => r.userId === myId);
      // One reaction per person per message (matches the backend's PK) —
      // picking a new emoji replaces whichever one you already had; picking
      // the same one again clears it.
      if (mine?.emoji === emoji) {
        api.removeReaction(messageId).catch(() => {});
      } else {
        api.setReaction(messageId, emoji).catch(() => {});
      }
    },
    [messages]
  );

  return { messages, isLoading, hasMore, isLoadingOlder, loadOlder, toggleReaction };
}
