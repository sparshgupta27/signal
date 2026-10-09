import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";

export const conversationsQueryKey = ["conversations"] as const;

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
