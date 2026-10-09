"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreVertical, SquarePen } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { NewChatDialog } from "@/components/dialogs/NewChatDialog";
import { AddContactDialog } from "@/components/dialogs/AddContactDialog";
import { conversationsQueryKey, useConversations } from "@/hooks/useConversations";
import { useUiStore } from "@/store/uiStore";
import * as api from "@/lib/api";

export function ChatListHeader() {
  const [addContactOpen, setAddContactOpen] = useState(false);
  const composeOpen = useUiStore((s) => s.newChatOpen);
  const composeMode = useUiStore((s) => s.newChatMode);
  const openNewChat = useUiStore((s) => s.openNewChat);
  const closeNewChat = useUiStore((s) => s.closeNewChat);
  const { conversations } = useConversations();
  const queryClient = useQueryClient();

  const markAllRead = async () => {
    await Promise.all(
      conversations.filter((c) => c.unreadCount > 0).map((c) => api.markRead(c.id))
    );
    queryClient.setQueryData(
      conversationsQueryKey,
      conversations.map((c) => ({ ...c, unreadCount: 0 }))
    );
    toast("All chats marked as read");
  };

  return (
    <div className="flex h-14 shrink-0 items-center justify-between px-4">
      <h1 className="text-[20px] font-semibold text-primary">Chats</h1>
      <div className="flex items-center gap-1">
        <IconButton label="New chat" onClick={() => openNewChat("browse")}>
          <SquarePen size={20} strokeWidth={1.75} />
        </IconButton>
        <Menu>
          <MenuTrigger asChild>
            <IconButton label="More options" showTooltip={false}>
              <MoreVertical size={20} strokeWidth={1.75} />
            </IconButton>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem onSelect={() => openNewChat("new-group")}>New group</MenuItem>
            <MenuItem onSelect={() => setAddContactOpen(true)}>Add contact</MenuItem>
            <MenuItem onSelect={markAllRead}>Mark all read</MenuItem>
            <MenuSeparator />
            <MenuItem disabled>Archived chats</MenuItem>
          </MenuContent>
        </Menu>
      </div>

      <NewChatDialog
        open={composeOpen}
        initialMode={composeMode}
        onOpenChange={(next) => (next ? openNewChat(composeMode) : closeNewChat())}
        onRequestAddContact={() => {
          closeNewChat();
          setAddContactOpen(true);
        }}
      />
      <AddContactDialog open={addContactOpen} onOpenChange={setAddContactOpen} />
    </div>
  );
}
