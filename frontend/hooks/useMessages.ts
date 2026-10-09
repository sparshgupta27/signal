import { useCallback, useEffect, useState } from "react";
import type { Message } from "@/types";
import * as api from "@/lib/mock/api";
import { CURRENT_USER_ID } from "@/lib/mock/data";
import { mockSocket } from "@/lib/mock/socket";

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
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    const offNew = mockSocket.on("message.new", ({ message }) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
    });
    const offStatus = mockSocket.on("message.status", (data) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, status: data.status } : m))
      );
    });
    const offDeleted = mockSocket.on("message.deleted", (data) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, deletedAt: data.deletedAt, body: "", attachment: null }
            : m
        )
      );
    });
    return () => {
      offNew();
      offStatus();
      offDeleted();
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

  // Local-only toggle (not round-tripped through the mock backend) — reactions
  // are a bonus-tier feature here, this is enough to make the UI feel real.
  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const already = m.reactions.some(
          (r) => r.userId === CURRENT_USER_ID && r.emoji === emoji
        );
        const reactions = already
          ? m.reactions.filter((r) => !(r.userId === CURRENT_USER_ID && r.emoji === emoji))
          : [...m.reactions, { emoji, userId: CURRENT_USER_ID }];
        return { ...m, reactions };
      })
    );
  }, []);

  return { messages, isLoading, hasMore, isLoadingOlder, loadOlder, toggleReaction };
}
