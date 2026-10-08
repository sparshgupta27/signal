import { useEffect } from "react";
import { mockSocket } from "@/lib/mock/socket";

/**
 * Clears the unread badge for the open conversation. Re-runs whenever the
 * message count changes so a message that arrives while the chat is already
 * open gets marked read too, not just the initial open.
 */
export function useMarkRead(conversationId: string, messageCount: number) {
  useEffect(() => {
    if (document.visibilityState !== "visible") return;
    mockSocket.markRead(conversationId);
  }, [conversationId, messageCount]);
}
