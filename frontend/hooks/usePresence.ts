import { useMemo } from "react";
import { getUser } from "@/lib/users";
import { usePresenceStore } from "@/store/presenceStore";

export function usePresence(userId: string | undefined) {
  const override = usePresenceStore((s) => (userId ? s.users[userId] : undefined));
  return useMemo(() => {
    const seedUser = getUser(userId);
    return {
      isOnline: override?.isOnline ?? seedUser?.isOnline ?? false,
      lastSeenAt: override ? override.lastSeenAt : seedUser?.lastSeenAt ?? null,
    };
  }, [override, userId]);
}

/** Other users currently typing in a conversation (excludes self). */
export function useTypingUsers(conversationId: string): string[] {
  const typingSet = usePresenceStore((s) => s.typing[conversationId]);
  return useMemo(() => (typingSet ? Array.from(typingSet) : []), [typingSet]);
}
