import { useCallback } from "react";
import type { MessageAttachment } from "@/types";
import { wsClient } from "@/lib/ws";

export function useSendMessage(conversationId: string) {
  const send = useCallback(
    (
      body: string,
      opts?: {
        replyToId?: string;
        /** Already uploaded via api.uploadAttachment — only the id goes over the wire. */
        attachmentId?: string;
        /** Local-preview only, for the optimistic bubble. */
        attachmentPreview?: MessageAttachment | null;
      }
    ) => {
      const trimmed = body.trim();
      if (!trimmed && !opts?.attachmentId) return;
      const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      wsClient.sendMessage(conversationId, {
        clientId,
        body: trimmed,
        replyToId: opts?.replyToId ?? null,
        attachmentIds: opts?.attachmentId ? [opts.attachmentId] : [],
        attachmentPreview: opts?.attachmentPreview ?? null,
      });
    },
    [conversationId]
  );

  return { send };
}
