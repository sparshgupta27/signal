import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";

export const blockedUsersQueryKey = ["blocked-users"] as const;

export function useBlockedUsers() {
  const query = useQuery({
    queryKey: blockedUsersQueryKey,
    queryFn: async () => (await api.getBlockedUserIds()).userIds,
  });
  return { blockedUserIds: query.data ?? [], isLoading: query.isLoading };
}

export function useIsBlocked(userId: string | undefined): boolean {
  const { blockedUserIds } = useBlockedUsers();
  return !!userId && blockedUserIds.includes(userId);
}

export function useBlockActions() {
  const queryClient = useQueryClient();

  const blockUser = useCallback(
    async (userId: string, name: string) => {
      await api.blockUser(userId);
      await queryClient.invalidateQueries({ queryKey: blockedUsersQueryKey });
      toast(`${name} blocked`);
    },
    [queryClient]
  );

  const unblockUser = useCallback(
    async (userId: string, name: string) => {
      await api.unblockUser(userId);
      await queryClient.invalidateQueries({ queryKey: blockedUsersQueryKey });
      toast(`${name} unblocked`);
    },
    [queryClient]
  );

  return { blockUser, unblockUser };
}
