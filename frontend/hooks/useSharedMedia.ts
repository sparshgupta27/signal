import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";

export function useSharedMedia(conversationId: string) {
  const query = useQuery({
    queryKey: ["conversations", conversationId, "media"],
    queryFn: () => api.getSharedMedia(conversationId),
  });

  return { media: query.data ?? [], isLoading: query.isLoading };
}
