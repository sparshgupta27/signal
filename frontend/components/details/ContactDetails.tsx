"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Image, Lock, Search, Timer, UserCheck, UserPlus } from "lucide-react";
import type { Conversation } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { getOtherMemberId } from "@/lib/conversationDisplay";
import { getUser } from "@/lib/mock/data";
import { usePresence } from "@/hooks/usePresence";
import { useConversationActions } from "@/hooks/useConversationActions";
import { useContactActions } from "@/hooks/useContactActions";
import { useIsContact } from "@/hooks/useContacts";
import { formatDisappearingDuration, formatLastSeenLabel } from "@/lib/format";
import { ComingSoonDialog } from "@/components/dialogs/ComingSoonDialog";
import { DisappearingMessagesDialog } from "@/components/dialogs/DisappearingMessagesDialog";

function ActionTile({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Bell;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-lg py-3 text-secondary hover:bg-row-hover hover:text-primary"
    >
      <Icon size={20} strokeWidth={1.75} />
      <span className="text-[12px] font-medium">{label}</span>
    </button>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className="mx-4 mb-4 divide-y divide-divider rounded-lg bg-sidebar">{children}</div>;
}

function Row({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof Timer;
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-row-hover first:rounded-t-lg last:rounded-b-lg"
    >
      <Icon size={18} strokeWidth={1.75} className="text-secondary" />
      <span className="flex-1 text-[13.5px] text-primary">{label}</span>
      {value && <span className="text-[13px] text-secondary">{value}</span>}
    </button>
  );
}

export function ContactDetails({ conversation }: { conversation: Conversation }) {
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const [disappearingOpen, setDisappearingOpen] = useState(false);
  const otherId = getOtherMemberId(conversation);
  const user = getUser(otherId);
  const presence = usePresence(otherId);
  const { toggleMute, setDisappearing } = useConversationActions();
  const { addContact, removeContact } = useContactActions();
  const isContact = useIsContact(otherId);

  if (!user) return null;

  return (
    <div className="py-4">
      <div className="flex flex-col items-center gap-2 px-4 pb-4">
        <Avatar id={user.id} name={user.name} size={80} online={presence.isOnline} />
        <h2 className="text-[18px] font-semibold text-primary">{user.name}</h2>
        <p className="text-[13px] text-secondary">
          {presence.isOnline ? "Online" : formatLastSeenLabel(presence.lastSeenAt)}
        </p>
        {user.about && <p className="text-[13.5px] text-secondary">{user.about}</p>}
      </div>

      <div className="mx-4 mb-4 flex divide-x divide-divider rounded-lg bg-sidebar">
        <ActionTile icon={Bell} label="Message" onClick={() => toast("Already in this chat")} />
        <ActionTile icon={Search} label="Search" onClick={() => toast("Search in chat is coming soon")} />
        <ActionTile
          icon={conversation.isMuted ? BellOff : Bell}
          label={conversation.isMuted ? "Unmute" : "Mute"}
          onClick={() => toggleMute(conversation, !conversation.isMuted)}
        />
      </div>

      <SectionCard>
        {isContact ? (
          <Row icon={UserCheck} label="In your contacts" value="Remove" onClick={() => removeContact(user.id)} />
        ) : (
          <Row icon={UserPlus} label="Add to contacts" onClick={() => addContact(user.id)} />
        )}
      </SectionCard>

      <SectionCard>
        <Row
          icon={Timer}
          label="Disappearing messages"
          value={formatDisappearingDuration(conversation.disappearingSeconds)}
          onClick={() => setDisappearingOpen(true)}
        />
        <Row icon={Image} label="Shared media" value="None yet" onClick={() => setComingSoon("Shared media")} />
      </SectionCard>

      <SectionCard>
        <Row icon={Lock} label="View safety number" onClick={() => setComingSoon("Safety number")} />
      </SectionCard>

      <div className="mx-4">
        <button
          type="button"
          onClick={() => toast(`${user.name} blocked`)}
          className="w-full rounded-lg px-3 py-3 text-left text-[13.5px] font-medium text-danger hover:bg-danger/10"
        >
          Block {user.name.split(" ")[0]}
        </button>
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
    </div>
  );
}
