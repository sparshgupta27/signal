import { useEffect } from "react";
import { wsClient } from "@/lib/ws";

/**
 * Clears the unread badge for the open conversation, marking read up
 * through whatever the latest loaded message is. Re-runs whenever that
 * latest message changes so one that arrives while the chat is already
 * open gets marked read too, not just the initial open.
 */
export function useMarkRead(conversationId: string, latestMessageId: string | undefined) {
  useEffect(() => {
    if (!latestMessageId) return;
    if (document.visibilityState !== "visible") return;
    wsClient.markRead(conversationId, latestMessageId);
  }, [conversationId, latestMessageId]);
}
