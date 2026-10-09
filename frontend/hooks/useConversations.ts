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
