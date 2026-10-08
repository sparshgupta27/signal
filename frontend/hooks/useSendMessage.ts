import { useCallback } from "react";
import { mockSocket } from "@/lib/mock/socket";

export function useSendMessage(conversationId: string) {
  const send = useCallback(
    (body: string, opts?: { replyToId?: string }) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      mockSocket.sendMessage(conversationId, {
        clientId,
        body: trimmed,
        replyToId: opts?.replyToId ?? null,
      });
    },
    [conversationId]
  );

  return { send };
}
