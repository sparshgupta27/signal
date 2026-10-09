"use client";

import { use, useEffect } from "react";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { DetailsPanel } from "@/components/details/DetailsPanel";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useMarkRead } from "@/hooks/useMarkRead";
import { useChatStore } from "@/store/chatStore";
import { useUiStore } from "@/store/uiStore";
import { getCurrentUserId } from "@/lib/session";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = use(params);

  const { conversations, isLoading: conversationsLoading } = useConversations();
  const conversation = conversations.find((c) => c.id === conversationId);

  const { messages, isLoading, hasMore, isLoadingOlder, loadOlder, toggleReaction } =
    useMessages(conversationId);

  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const closeDetailsPanel = useUiStore((s) => s.closeDetailsPanel);
  const replyTargetId = useUiStore((s) => s.replyTargets[conversationId]);
  const setReplyTarget = useUiStore((s) => s.setReplyTarget);
  const replyTo = replyTargetId ? messages.find((m) => m.id === replyTargetId) ?? null : null;

  useMarkRead(conversationId, messages[messages.length - 1]?.id);

  useEffect(() => {
    setActiveConversationId(conversationId);
    closeDetailsPanel();
    return () => setActiveConversationId(null);
  }, [conversationId, setActiveConversationId, closeDetailsPanel]);

  if (conversationsLoading) {
    return <div className="flex min-w-0 flex-1 bg-app" />;
  }

  if (!conversation) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 bg-app text-center">
        <p className="text-[14px] text-secondary">This conversation doesn&apos;t exist.</p>
      </div>
    );
  }

  const canSend = conversation.memberIds.includes(getCurrentUserId() ?? "");

  return (
    <div className="relative flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatHeader conversation={conversation} />
        <MessageList
          conversation={conversation}
          messages={messages}
          isLoading={isLoading}
          hasMore={hasMore}
          isLoadingOlder={isLoadingOlder}
          onLoadOlder={loadOlder}
          onReply={(m) => setReplyTarget(conversationId, m.id)}
          onReact={(m, emoji) => toggleReaction(m.id, emoji)}
        />
        <Composer
          conversationId={conversationId}
          canSend={canSend}
          replyTo={replyTo}
          onCancelReply={() => setReplyTarget(conversationId, undefined)}
        />
      </div>
      <DetailsPanel conversation={conversation} />
    </div>
  );
}
