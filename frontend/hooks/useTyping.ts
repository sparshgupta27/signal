import { useCallback, useEffect, useRef } from "react";
import { wsClient } from "@/lib/ws";

/** Throttles typing.start to once per 3s while typing; auto-stops after 2s idle. */
export function useTyping(conversationId: string) {
  const lastSentAt = useRef(0);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTyping = useCallback(() => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
    if (lastSentAt.current !== 0) {
      wsClient.setTyping(conversationId, false);
      lastSentAt.current = 0;
    }
  }, [conversationId]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentAt.current > 3000) {
      wsClient.setTyping(conversationId, true);
      lastSentAt.current = now;
    }
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(stopTyping, 2000);
  }, [conversationId, stopTyping]);

  useEffect(() => stopTyping, [stopTyping]);

  return { notifyTyping, stopTyping };
}
