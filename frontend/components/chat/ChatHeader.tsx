"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MoreVertical, Phone, Search, Video } from "lucide-react";
import type { Conversation } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { ComingSoonDialog } from "@/components/dialogs/ComingSoonDialog";
import { DisappearingMessagesDialog } from "@/components/dialogs/DisappearingMessagesDialog";
import { SafetyNumberDialog } from "@/components/dialogs/SafetyNumberDialog";
import {
  getConversationAvatarId,
  getConversationAvatarUrl,
  getConversationTitle,
  getOtherMemberId,
} from "@/lib/conversationDisplay";
import { formatLastSeenLabel } from "@/lib/format";
import { usePresence, useTypingUsers } from "@/hooks/usePresence";
import { useConversationActions } from "@/hooks/useConversationActions";
import { useUiStore } from "@/store/uiStore";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useRouter } from "next/navigation";

export function ChatHeader({ conversation }: { conversation: Conversation }) {
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const [disappearingOpen, setDisappearingOpen] = useState(false);
  const [safetyNumberOpen, setSafetyNumberOpen] = useState(false);
  const title = getConversationTitle(conversation);
  const otherId = getOtherMemberId(conversation);
  const presence = usePresence(conversation.type === "direct" ? otherId : undefined);
  const typingUsers = useTypingUsers(conversation.id);
  const openDetailsPanel = useUiStore((s) => s.openDetailsPanel);
  const { toggleMute, setDisappearing, archive, unarchive } = useConversationActions();
  const isMobile = useIsMobile();
  const router = useRouter();

  const subtitle =
    typingUsers.length > 0
      ? "typing…"
      : conversation.type === "direct"
        ? presence.isOnline
          ? "Online"
          : formatLastSeenLabel(presence.lastSeenAt)
        : `${conversation.memberIds.length} members`;

  return (
    <div className="flex h-15 shrink-0 items-center justify-between border-b border-divider px-4">
      <div className="flex min-w-0 items-center gap-3">
        {isMobile && (
          <IconButton label="Back" showTooltip={false} onClick={() => router.push("/")}>
            <ArrowLeft size={20} />
          </IconButton>
        )}
        <button
          type="button"
          onClick={openDetailsPanel}
          className="flex min-w-0 items-center gap-3 rounded-md px-1 py-1 text-left hover:bg-row-hover"
        >
          <Avatar
            id={getConversationAvatarId(conversation)}
            name={title}
            src={getConversationAvatarUrl(conversation)}
            size={36}
            online={conversation.type === "direct" && presence.isOnline}
          />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-primary">{title}</div>
            <div className={typingUsers.length > 0 ? "truncate text-[12.5px] text-accent" : "truncate text-[12.5px] text-secondary"}>
              {subtitle}
            </div>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <IconButton label="Voice call" onClick={() => setComingSoon("Voice calls")}>
          <Phone size={19} strokeWidth={1.75} />
        </IconButton>
        <IconButton label="Video call" onClick={() => setComingSoon("Video calls")}>
          <Video size={20} strokeWidth={1.75} />
        </IconButton>
        <IconButton label="Search in conversation" onClick={() => toast("Search in chat is coming soon")}>
          <Search size={19} strokeWidth={1.75} />
        </IconButton>
        <Menu>
          <MenuTrigger asChild>
            <IconButton label="More options" showTooltip={false}>
              <MoreVertical size={20} strokeWidth={1.75} />
            </IconButton>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem onSelect={() => setDisappearingOpen(true)}>Disappearing messages</MenuItem>
            {conversation.type === "direct" && (
              <MenuItem onSelect={() => setSafetyNumberOpen(true)}>View safety number</MenuItem>
            )}
            <MenuItem onSelect={() => toggleMute(conversation, !conversation.isMuted)}>
              {conversation.isMuted ? "Unmute" : "Mute"}
            </MenuItem>
            <MenuItem
              onSelect={() => (conversation.isArchived ? unarchive(conversation) : archive(conversation))}
            >
              {conversation.isArchived ? "Unarchive chat" : "Archive chat"}
            </MenuItem>
            <MenuSeparator />
            <MenuItem danger onSelect={() => toast("Chat deleted")}>
              Delete chat
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      <ComingSoonDialog
        open={comingSoon !== null}
        onOpenChange={(open) => !open && setComingSoon(null)}
        title={comingSoon ?? ""}
      />

      <DisappearingMessagesDialog
        open={disappearingOpen}
        onOpenChange={setDisappearingOpen}
        currentSeconds={conversation.disappearingSeconds}
        onConfirm={(seconds) => setDisappearing(conversation.id, seconds)}
      />

      <SafetyNumberDialog
        otherUserId={otherId}
        open={safetyNumberOpen}
        onOpenChange={setSafetyNumberOpen}
      />
    </div>
  );
}
