import { useEffect } from "react";
import * as api from "@/lib/api";

/**
 * Clears the unread badge for the open conversation, marking read up
 * through whatever the latest loaded message is. Re-runs whenever that
 * latest message changes so one that arrives while the chat is already
 * open gets marked read too, not just the initial open.
 *
 * Goes over REST, not the WS client — a WS send is silently dropped if the
 * socket isn't OPEN at that exact instant (briefly reconnecting, a tab just
 * waking up), with no retry, which read intermittently appearing stuck as
 * unread traced back to. A plain HTTP request has no such race.
 */
export function useMarkRead(conversationId: string, latestMessageId: string | undefined) {
  useEffect(() => {
    if (!latestMessageId) return;
    const mark = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        api.markRead(conversationId).catch(() => {});
      }
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    window.addEventListener("focus", mark);
    return () => {
      document.removeEventListener("visibilitychange", mark);
      window.removeEventListener("focus", mark);
    };
  }, [conversationId, latestMessageId]);
}
