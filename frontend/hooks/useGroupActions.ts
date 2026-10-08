import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Conversation, GroupRole } from "@/types";
import * as api from "@/lib/mock/api";
import { conversationsQueryKey } from "./useConversations";

export function useGroupActions() {
  const queryClient = useQueryClient();

  const patch = useCallback(
    (updated: Conversation) => {
      queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (prev) =>
        prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : prev
      );
    },
    [queryClient]
  );

  const addMembers = useCallback(
    async (conversationId: string, userIds: string[]) => {
      const updated = await api.addMembers(conversationId, userIds);
      patch(updated);
      toast(userIds.length === 1 ? "Member added" : "Members added");
    },
    [patch]
  );

  const removeMember = useCallback(
    async (conversationId: string, userId: string) => {
      const updated = await api.removeMember(conversationId, userId);
      patch(updated);
      toast("Member removed");
    },
    [patch]
  );

  const setMemberRole = useCallback(
    async (conversationId: string, userId: string, role: GroupRole) => {
      const updated = await api.setMemberRole(conversationId, userId, role);
      patch(updated);
      toast(role === "admin" ? "Made admin" : "Removed as admin");
    },
    [patch]
  );

  return { addMembers, removeMember, setMemberRole };
}
