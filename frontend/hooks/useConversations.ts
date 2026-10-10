import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";

export const conversationsQueryKey = ["conversations"] as const;
export const archivedConversationsQueryKey = ["conversations", "archived"] as const;

export function useConversations() {
  const query = useQuery({
    queryKey: conversationsQueryKey,
    queryFn: api.getConversations,
  });

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading,
  };
}

/** Looks a conversation up in the main list, then the archived one, so an
 * archived chat still opens (and can be messaged) without unarchiving it. */
export function useConversation(conversationId: string) {
  const main = useConversations();
  const inMain = main.conversations.find((c) => c.id === conversationId);
  const archivedQuery = useQuery({
    queryKey: archivedConversationsQueryKey,
    queryFn: api.getArchivedConversations,
    enabled: !main.isLoading && !inMain,
  });

  const conversation = inMain ?? archivedQuery.data?.find((c) => c.id === conversationId);
  return {
    conversation,
    // isPending, not isLoading: on the render where the archived query
    // first gets enabled it hasn't started fetching yet, and isLoading
    // would be false — flashing "doesn't exist" for a frame.
    isLoading: main.isLoading || (!inMain && archivedQuery.isPending),
  };
}

export function useArchivedConversations(enabled: boolean) {
  const query = useQuery({
    queryKey: archivedConversationsQueryKey,
    queryFn: api.getArchivedConversations,
    enabled,
  });

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading,
  };
}
