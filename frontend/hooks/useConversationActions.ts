import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Conversation } from "@/types";
import * as api from "@/lib/mock/api";
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

  // Our mock store has no separate "deleted" state, so both archive and
  // delete route through isArchived — it's already excluded everywhere
  // (chat list, periodic simulated messages), which also stops a "deleted"
  // chat from silently reappearing if a background event targets its id.
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

  return { togglePin, toggleMute, toggleRead, archive, remove };
}
