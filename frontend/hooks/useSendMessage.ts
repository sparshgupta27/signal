import { useCallback } from "react";
import type { MessageAttachment } from "@/types";
import { mockSocket } from "@/lib/mock/socket";

export function useSendMessage(conversationId: string) {
  const send = useCallback(
    (body: string, opts?: { replyToId?: string; attachment?: MessageAttachment | null }) => {
      const trimmed = body.trim();
      if (!trimmed && !opts?.attachment) return;
      const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      mockSocket.sendMessage(conversationId, {
        clientId,
        body: trimmed,
        replyToId: opts?.replyToId ?? null,
        attachment: opts?.attachment ?? null,
      });
    },
    [conversationId]
  );

  return { send };
}
