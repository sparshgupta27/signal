import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Conversation } from "@/types";
import * as api from "@/lib/api";
import { formatDisappearingDuration } from "@/lib/format";
import { conversationsQueryKey } from "./useConversations";

/** Chat-list row actions (pin, mute, read state, archive, delete). */
export function useConversationActions() {
  const queryClient = useQueryClient();

  const patch = useCallback(
    (updated: Conversation) => {
      queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (prev) =>
        prev ? api.sortConversations(prev.map((c) => (c.id === updated.id ? updated : c))) : prev
      );
    },
    [queryClient]
  );

  const removeFromList = useCallback(
    (id: string) => {
      queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (prev) =>
        prev ? prev.filter((c) => c.id !== id) : prev
      );
    },
    [queryClient]
  );

  const togglePin = useCallback(
    async (conversation: Conversation) => {
      const updated = await api.setConversationFlags(conversation.id, {
        isPinned: !conversation.isPinned,
      });
      patch(updated);
    },
    [patch]
  );

  const toggleMute = useCallback(
    async (conversation: Conversation, muted: boolean) => {
      const updated = await api.setConversationFlags(conversation.id, { isMuted: muted });
      patch(updated);
      toast(muted ? "Notifications muted" : "Notifications unmuted");
    },
    [patch]
  );

  const toggleRead = useCallback(
    async (conversation: Conversation) => {
      if (conversation.unreadCount > 0) {
        await api.markRead(conversation.id);
        patch({ ...conversation, unreadCount: 0 });
      } else {
        patch({ ...conversation, unreadCount: 1 });
      }
    },
    [patch]
  );

  // Archive and delete both route through isArchived — there's no separate
  // "deleted" state server-side either, and it's already excluded from the
  // chat list query everywhere.
  const archive = useCallback(
    async (conversation: Conversation) => {
      await api.setConversationFlags(conversation.id, { isArchived: true });
      removeFromList(conversation.id);
      toast("Chat archived");
    },
    [removeFromList]
  );

  const remove = useCallback(
    async (conversation: Conversation) => {
      await api.setConversationFlags(conversation.id, { isArchived: true });
      removeFromList(conversation.id);
      toast("Chat deleted");
    },
    [removeFromList]
  );

  // Not patched locally — the backend posts a system message AND broadcasts
  // conversation.updated over the same WebSocket useSocketBridge already
  // listens on, so both the open thread and this query cache update
  // themselves. Can genuinely fail now (admins-only in a group), unlike the
  // old mock version which always succeeded.
  const setDisappearing = useCallback(async (conversationId: string, seconds: number | null) => {
    try {
      await api.setDisappearing(conversationId, seconds);
      toast(
        seconds
          ? `Disappearing messages set to ${formatDisappearingDuration(seconds)}`
          : "Disappearing messages turned off"
      );
    } catch {
      toast("Couldn't update disappearing messages");
    }
  }, []);

  return { togglePin, toggleMute, toggleRead, archive, remove, setDisappearing };
}
