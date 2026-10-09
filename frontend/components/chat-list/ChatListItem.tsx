"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BellOff, Pin } from "lucide-react";
import type { Conversation } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/ContextMenu";
import { cn } from "@/lib/cn";
import {
  getConversationAvatarId,
  getConversationAvatarUrl,
  getConversationTitle,
  getOtherMemberId,
  getPreviewText,
} from "@/lib/conversationDisplay";
import { formatListTime } from "@/lib/format";
import { usePresence, useTypingUsers } from "@/hooks/usePresence";
import { useConversationActions } from "@/hooks/useConversationActions";

interface ChatListItemProps {
  conversation: Conversation;
  isActive: boolean;
}

export function ChatListItem({ conversation, isActive }: ChatListItemProps) {
  const title = getConversationTitle(conversation);
  const avatarId = getConversationAvatarId(conversation);
  const avatarUrl = getConversationAvatarUrl(conversation);
  const otherId = getOtherMemberId(conversation);
  const presence = usePresence(conversation.type === "direct" ? otherId : undefined);
  const typingUsers = useTypingUsers(conversation.id);
  const isTyping = typingUsers.length > 0;
  const { togglePin, toggleMute, toggleRead, archive, unarchive, remove } = useConversationActions();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Link href={`/chat/${conversation.id}`} className="block px-2">
          <motion.div
            layout
            className={cn(
              "flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors duration-[120ms] ease-signal",
              isActive ? "bg-row-selected" : "hover:bg-row-hover"
            )}
          >
            <Avatar
              id={avatarId}
              name={title}
              src={avatarUrl}
              size={48}
              online={conversation.type === "direct" && presence.isOnline}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[15px] font-semibold text-primary">{title}</span>
                <span className="shrink-0 text-[12px] text-secondary">
                  {conversation.lastMessageAt ? formatListTime(conversation.lastMessageAt) : ""}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                {isTyping ? (
                  <span className="truncate text-[13.5px] italic text-accent">typing…</span>
                ) : (
                  <span className="truncate text-[13.5px] text-secondary">
                    {getPreviewText(conversation)}
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  {conversation.isPinned && <Pin size={13} className="text-secondary" />}
                  {conversation.isMuted && <BellOff size={13} className="text-secondary" />}
                  {conversation.unreadCount > 0 && (
                    <Badge count={conversation.unreadCount} variant={conversation.isMuted ? "muted" : "accent"} />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </Link>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => togglePin(conversation)}>
          {conversation.isPinned ? "Unpin chat" : "Pin chat"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => toggleRead(conversation)}>
          {conversation.unreadCount > 0 ? "Mark as read" : "Mark as unread"}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            {conversation.isMuted ? "Unmute notifications" : "Mute notifications"}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={() => toggleMute(conversation, true)}>1 hour</ContextMenuItem>
            <ContextMenuItem onSelect={() => toggleMute(conversation, true)}>8 hours</ContextMenuItem>
            <ContextMenuItem onSelect={() => toggleMute(conversation, true)}>1 day</ContextMenuItem>
            <ContextMenuItem onSelect={() => toggleMute(conversation, true)}>Always</ContextMenuItem>
            {conversation.isMuted && (
              <ContextMenuItem onSelect={() => toggleMute(conversation, false)}>Unmute</ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem
          onSelect={() => (conversation.isArchived ? unarchive(conversation) : archive(conversation))}
        >
          {conversation.isArchived ? "Unarchive chat" : "Archive chat"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem danger onSelect={() => remove(conversation)}>
          Delete chat
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
